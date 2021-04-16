import * as PIXI from 'pixi.js';

import { Collisions, TAGS } from 'collisions/collisions';
import { Shape } from 'collisions/proxyTypes';
import { Result } from 'collisions/result';
import {
  PI,
  randomInRange,
  interpolateRadians,
  normalizeRadians,
  randomSign,
  twoPI,
  mapRangeClamped,
  halfPI,
  getMiddleOfTwoRadians,
  getRadiansFromAtoB,
} from 'utils/math';
import { Ant } from 'Ant';
import { Nest } from 'Nest';
import { Pheromone } from 'Pheromone';
import { Food } from 'Food';
import FoodImage from 'assets/food.png';
import { Timer } from 'Timer';

let xMouse = 0;
let yMouse = 0;
const mouseSpawnedPheromones: Pheromone[] = [];
let leftMouseDown = false;
let shouldMousePush = false;

function getmousePosition(event: MouseEvent): void {
  const e = event || window.event;
  let x = e.pageX;
  let y = e.pageY;

  // IE 8
  if (x === undefined || x === null) {
    const { scrollLeft, scrollTop } = document.body;
    const { documentElement } = document;
    x = e.clientX + scrollLeft + documentElement.scrollLeft;
    y = e.clientY + scrollTop + documentElement.scrollTop;
  }

  xMouse = x;
  yMouse = y;
}

document.addEventListener('mousemove', getmousePosition);
document.addEventListener('mousedown', () => {
  leftMouseDown = true;
});
document.addEventListener('mouseup', () => {
  leftMouseDown = false;
});
document.addEventListener('keydown', () => {
  shouldMousePush = !shouldMousePush;
});

export const setupSimulation = (
  container: HTMLElement,
  app: PIXI.Application,
  particles: PIXI.ParticleContainer,
  draw: PIXI.Graphics,
): void => {
  const { Sprite } = PIXI;
  const foodChunkTexture = PIXI.Texture.from(FoodImage);
  const result = new Result();
  const collisions = new Collisions();
  const { ANT, OBSTACLE, NEST, NEST_VISIBLE_AREA, SCENT_NEST, FOOD, SCENT_FOOD } = TAGS;
  const { offsetWidth: worldWidth, offsetHeight: worldHeight } = container;
  collisions.createWorldBounds(app.view.width, app.view.height, 10);

  const pheromones = new Map<Pheromone, Pheromone>();
  let scentIdCounter = 0;

  const nest = new Nest(worldWidth * 0.5, worldHeight * 0.5);
  nest.zIndex = 1;
  collisions.insert(nest.body, nest.areaIsVisibleIn);
  app.stage.addChild(nest);

  const foodAmount = 100;
  for (let i = 0; i < foodAmount; i++) {
    const foodPeace = new Food(
      worldWidth * 0.3 + randomInRange(-50, 50),
      worldHeight * 0.3 + randomInRange(-50, 50),
    );
    nest.zIndex = 1;
    collisions.insert(foodPeace.body);
    app.stage.addChild(foodPeace);
  }

  const ants: Ant[] = [];

  let lastTime = performance.now();

  function simulationUpdate() {
    const frameStartTime = performance.now();
    const deltaTime = (frameStartTime - lastTime) / 1000;

    collisions.update();
    for (const ant of ants) {
      const { body, maxSpeed } = ant;
      let { speed, hasFood } = ant;
      const { rotation } = body;
      const makes180turn = false;
      let followedScent: number | undefined;
      // used to test which scent is oldest, which might mean it leads to the nest
      let followedScendAge = 10000;

      if (speed < maxSpeed) speed += deltaTime * 5;
      if (speed > maxSpeed) speed = maxSpeed;
      body.x -=
        Math.cos(rotation + Math.PI * 0.5) * deltaTime * speed /* (leftMouseDown ? 150 : speed) */;
      body.y -=
        Math.sin(rotation + Math.PI * 0.5) * deltaTime * speed /* (leftMouseDown ? 150 : speed) */;

      let targetRotation = rotation;
      const reversedRotation = rotation - PI;

      ant.nestScent -= deltaTime;
      ant.foodScent -= deltaTime;

      const potentials = collisions.getPotentials(body as Shape);
      for (const other of potentials) {
        if (collisions.isCollision(body as Shape, other, result)) {
          const { overlap, overlap_x, overlap_y } = result;

          /* eslint-disable indent */
          switch (other.tag) {
            case ANT:
              body.x -= overlap! * overlap_x;
              body.y -= overlap! * overlap_y;
              const otherAnt = other.spriteRef as Ant;
              // ant with food will pass the direction to food to and without food
              if (hasFood && !otherAnt.hasFood) {
                otherAnt.rotation = reversedRotation;
                other.rotation = reversedRotation;
              }
              // ant without food will take information about food direction from the other with food
              else if (!hasFood && otherAnt.hasFood) {
                const otherReversedRotation = otherAnt.rotation - PI;
                ant.rotation = otherReversedRotation;
                body.rotation = otherReversedRotation;
              }
              break;

            case OBSTACLE:
              body.x -= overlap! * overlap_x;
              body.y -= overlap! * overlap_y;
              speed = maxSpeed * 0.5;
              targetRotation -= PI;
              break;

            case NEST_VISIBLE_AREA:
              if (hasFood) {
                followedScent = ant.getRotationAtPoint(other.x, other.y);
              }
              break;

            case NEST:
              ant.nestScent = 16;
              if (hasFood) {
                followedScent = targetRotation - PI;
                hasFood = false;
              }
              if (ant.attachedFoodSprite) app.stage.removeChild(ant.attachedFoodSprite);
              ant.attachedFoodSprite = undefined;
              break;

            case FOOD:
              const food = other.spriteRef as Food;
              if (!food.isEmpty && !hasFood) {
                if (!followedScent) followedScent = targetRotation - PI;
                ant.nestScent = 0;
                hasFood = true;
                ant.foodScent = 16;
                food.haveABite();
                ant.attachedFoodSprite = Sprite.from(foodChunkTexture);
                ant.attachedFoodSprite.scale.set(0.2);
                ant.attachedFoodSprite.anchor.set(0.5, 1.2);
                ant.attachedFoodSprite.zIndex = 3;
                ant.recentlyVistedScentParticles = [];
                app.stage.addChild(ant.attachedFoodSprite);
              }
              break;

            case SCENT_FOOD:
              if (!hasFood) {
                const foodScent = other.spriteRef as Pheromone;
                const { /* antId,  id, */ x, y, strength, pointsToDirection } = foodScent;
                followedScent = normalizeRadians(pointsToDirection);
                // if (
                // !ant.recentlyVistedScentParticles.includes(foodScent.id) &&
                // antId === ant.id ||
                // !followedScendAge
                // strength < followedScendAge
                // ) {
                // const toScentSource = ant.getRotationAtPoint(x, y);
                // primaryDirection = normalizeRadians(pointsToDirection);
                // primaryDirection = getMiddleOfTwoRadians(
                //   normalizeRadians(pointsToDirection),
                //   normalizeRadians(toScentSource),
                // );
                // followedScendAge = strength;
                // ant.recentlyVistedScentParticles.unshift(id);
                // }
              }
              break;

            case SCENT_NEST:
              if (hasFood) {
                const nestScent = other.spriteRef as Pheromone;
                const { antId, /* id, x, y, */ strength, pointsToDirection } = nestScent;
                if (
                  // !ant.recentlyVistedScentParticles.includes(id) &&
                  antId === ant.id ||
                  strength < followedScendAge
                ) {
                  followedScent = normalizeRadians(pointsToDirection);
                  followedScendAge = strength;
                  // ant.recentlyVistedScentParticles.unshift(nestScent.id);
                }
              }
              break;

            default:
              break;
          }
          /* eslint-enable indent */
        }
      }

      // if (ant.recentlyVistedScentParticles.length > 127) ant.recentlyVistedScentParticles.pop();

      if (leftMouseDown) {
        // targetRotation = ant.getRotationAtPoint(xMouse, yMouse);
      } else {
        targetRotation +=
          ant.rotationSign > 0
            ? Math.sin(deltaTime * Math.random() * (followedScent ? 1.5 : 3))
            : -Math.sin(deltaTime * Math.random() * (followedScent ? 1.5 : 3));

        if (ant.rotationSignChangeTimer.update(deltaTime)) ant.rotationSign *= -1;

        if (targetRotation !== rotation) {
          targetRotation = normalizeRadians(
            followedScent ??
              interpolateRadians(
                rotation,
                normalizeRadians(targetRotation),
                deltaTime,
                makes180turn ? 64 : Math.random() * 16 - 8,
              ),
          );
        }
      }

      const { attachedFoodSprite } = ant;
      if (attachedFoodSprite !== undefined) {
        attachedFoodSprite.x = ant.x;
        attachedFoodSprite.y = ant.y;
        attachedFoodSprite.rotation = rotation;
      }

      if (ant.nestScent > 0) ant.nestScent -= deltaTime * 0.25;
      if (ant.foodScent > 0) ant.foodScent -= deltaTime * 0.25;

      if (ant.scentEmissionTimer.update(deltaTime)) {
        if (hasFood && ant.foodScent > 0) {
          const scent = new Pheromone(
            body.x,
            body.y,
            SCENT_FOOD,
            ant.foodScent,
            ++scentIdCounter,
            ant.id,
            reversedRotation,
          );
          collisions.insert(scent.body);
          app.stage.addChild(scent);
          pheromones.set(scent, scent);
        } else if (ant.nestScent > 0) {
          const scent = new Pheromone(
            body.x,
            body.y,
            SCENT_NEST,
            ant.nestScent,
            ++scentIdCounter,
            ant.id,
            reversedRotation,
          );
          collisions.insert(scent.body);
          app.stage.addChild(scent);
          pheromones.set(scent, scent);
        }
      }

      ant.x = body.x;
      ant.y = body.y;
      ant.speed = speed;
      ant.body.rotation = targetRotation;
      ant.rotation = targetRotation;
      ant.hasFood = hasFood;
    }

    // eslint-disable-next-line unicorn/no-array-for-each
    pheromones.forEach((particle: Pheromone): void => {
      if (particle.update(deltaTime)) {
        pheromones.delete(particle);
        collisions.remove(particle.body);
        app.stage.removeChild(particle);
      }
    });

    if (leftMouseDown) {
      const lastMouseSpawn = mouseSpawnedPheromones[mouseSpawnedPheromones.length - 1] ?? {
        x: nest.x,
        y: nest.y,
      };
      const scent = new Pheromone(
        xMouse,
        yMouse,
        SCENT_FOOD,
        32,
        ++scentIdCounter,
        0,
        getRadiansFromAtoB(xMouse, yMouse, lastMouseSpawn.x, lastMouseSpawn.y),
      );
      collisions.insert(scent.body);
      app.stage.addChild(scent);
      pheromones.set(scent, scent);
      mouseSpawnedPheromones.push(scent);
    }

    draw.clear();
    // draw.lineStyle(1, 0x550000);
    // collisions.draw(draw);

    lastTime = frameStartTime;
  }

  app.ticker.add(simulationUpdate);

  const numberOfAnts = app.renderer instanceof PIXI.Renderer ? 400 : 100;
  let antsIdCounter = 0;
  function releaseTheAnts() {
    setTimeout(() => {
      const { radius } = nest.body;
      const ant = new Ant(
        ++antsIdCounter,
        nest.x + randomSign() * randomInRange(radius - 15, radius - 2),
        nest.y + randomSign() * randomInRange(radius - 15, radius - 2),
        randomInRange(55, 65),
        // 0.5,
      );

      ants.push(ant);
      collisions.insert(ant.body as Shape);
      particles.addChild(ant);
      if (ants.length < numberOfAnts - 1) releaseTheAnts();
    }, 50);
  }

  releaseTheAnts();
};
