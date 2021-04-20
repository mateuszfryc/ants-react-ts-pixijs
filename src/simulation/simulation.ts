import * as PIXI from 'pixi.js';

import { Collisions, TAGS } from 'simulation/collisions/collisions';
import { Shape } from 'simulation/collisions/proxyTypes';
import { Result } from 'simulation/collisions/result';
import {
  PI,
  randomInRange,
  interpolateRadians,
  normalizeRadians,
  randomSign,
  getRadiansFromPointAtoB,
  clamp,
} from 'utils/math';
import { Ant } from 'simulation/Ant';
import { Nest } from 'simulation/Nest';
import { Pheromone } from 'simulation/Pheromone';
import { Food } from 'simulation/Food';
import FoodImage from 'assets/food.png';
import { setupAntCounter, setupFPSDisplay } from './debug';
import { Timer } from './Timer';

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
  console.log(particles);
  const { updateFPSDisplay } = setupFPSDisplay();
  const { updateAntsCounter } = setupAntCounter();
  const { Sprite } = PIXI;
  const foodChunkTexture = PIXI.Texture.from(FoodImage);
  const result = new Result();
  const collisions = new Collisions();
  const {
    ANT,
    OBSTACLE,
    NEST,
    NEST_VISIBLE_AREA,
    SCENT_NEST,
    FOOD,
    FOOD_SCENT_AREA,
    SCENT_FOOD,
  } = TAGS;
  const { offsetWidth: worldWidth, offsetHeight: worldHeight } = container;
  const worldBounds = collisions.createWorldBounds(app.view.width, app.view.height, 20, -19);

  const pheromones = new Map<Pheromone, Pheromone>();
  let scentIdCounter = 0;

  const nest = new Nest(worldWidth * 0.3, worldHeight * 0.5);
  nest.zIndex = 1;
  collisions.insert(nest.body, nest.areaIsVisibleIn);
  app.stage.addChild(nest);
  app.stage.addChild(nest.entranceCoverSprite);

  const foodAmount = 100;
  for (let i = 0; i < foodAmount; i++) {
    const foodPeace = new Food(
      worldWidth * 0.7 + randomInRange(-50, 50),
      worldHeight * 0.5 + randomInRange(-50, 50),
    );
    foodPeace.zIndex = 3;
    collisions.insert(foodPeace.body);
    collisions.insert(foodPeace.scentArea);
    app.stage.addChild(foodPeace);
  }

  // const osbtacle = collisions.addPolygon(worldWidth * 0.45, worldHeight * 0.2, [
  //   [0, 0],
  //   [worldWidth * 0.1, 0],
  //   [worldWidth * 0.1, worldHeight * 0.6],
  //   [0, worldHeight * 0.6],
  // ]);

  const ants: Ant[] = [];

  let lastTime = performance.now();
  const debugLogTimer = new Timer(0.5);

  function simulationUpdate() {
    const frameStartTime = performance.now();
    const deltaTime = (frameStartTime - lastTime) / 1000;
    let antsOnScreenCounter = 0;

    // update of the position of all moving bodies must be done before calling collisions.update()
    // for the collision tests to work properly
    for (const ant of ants) {
      const { body, speed, rotation } = ant;
      body.x -=
        Math.cos(rotation + Math.PI * 0.5) * deltaTime * speed /* (leftMouseDown ? 150 : speed) */;
      body.y -=
        Math.sin(rotation + Math.PI * 0.5) * deltaTime * speed /* (leftMouseDown ? 150 : speed) */;
    }

    collisions.update();
    for (const ant of ants) {
      const { body, maxSpeed } = ant;
      let { speed, hasFood, foundFood } = ant;
      const { rotation } = body;
      const makes180turn = false;
      let followedScent: number | undefined;
      // used to test which scent is oldest, which might mean it leads to the nest
      let { followedScendAge } = ant;

      if (speed < maxSpeed) speed += deltaTime * 4;
      if (speed > maxSpeed) speed = maxSpeed;

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
              // ant with food will pass the direction to food to an and without food
              if (hasFood && !otherAnt.hasFood) {
                otherAnt.rotation = reversedRotation;
                other.rotation = reversedRotation;
              }
              // ant without food will pass the direction to nest to ant with food
              else if (!hasFood && otherAnt.hasFood) {
                otherAnt.rotation = reversedRotation;
                other.rotation = reversedRotation;
              }
              break;

            case OBSTACLE:
              body.x -= overlap! * overlap_x;
              body.y -= overlap! * overlap_y;
              speed = maxSpeed * 0.3;
              followedScent = targetRotation - PI * -ant.rotationSign;
              break;

            case NEST_VISIBLE_AREA:
              if (hasFood) {
                followedScent = ant.getRotationAtPoint(other.x, other.y);
              }
              break;

            case NEST:
              ant.nestScent = Pheromone.scentInitialLifetime;
              if (hasFood) {
                followedScent = targetRotation - PI;
                hasFood = false;
                foundFood = false;
              }
              if (ant.attachedFoodSprite) app.stage.removeChild(ant.attachedFoodSprite);
              ant.attachedFoodSprite = undefined;
              break;

            case FOOD:
              body.x -= overlap! * overlap_x;
              body.y -= overlap! * overlap_y;
              targetRotation -= PI;
              const food = other.spriteRef as Food;
              if (!hasFood && !food.isEmpty) {
                followedScent = undefined;
                speed = 0;
                ant.nestScent = 0;
                hasFood = true;
                ant.foodScent = Pheromone.scentInitialLifetime;
                food.haveABite();
                ant.attachedFoodSprite = Sprite.from(foodChunkTexture);
                ant.attachedFoodSprite.scale.set(0.2);
                ant.attachedFoodSprite.anchor.set(0.5, 1.2);
                ant.attachedFoodSprite.zIndex = 3;
                ant.recentlyVistedScentParticles = [];
                app.stage.addChild(ant.attachedFoodSprite);
              }
              break;

            case FOOD_SCENT_AREA:
              if (!hasFood && !foundFood) {
                foundFood = true;
                followedScent = ant.getRotationAtPoint(other.x, other.y);
              }
              break;

            case SCENT_FOOD:
              const foodScent = other.spriteRef as Pheromone;
              if (
                !hasFood &&
                !foundFood &&
                !ant.recentlyVistedScentParticles.includes(foodScent.id) &&
                (foodScent.antId === ant.id ||
                  foodScent.strength > followedScendAge ||
                  !followedScent)
              ) {
                followedScent = normalizeRadians(foodScent.pointsToDirection);
                ant.recentlyVistedScentParticles.push(foodScent.id);
              }
              break;

            case SCENT_NEST:
              const nestScent = other.spriteRef as Pheromone;
              const { antId, id, strength, pointsToDirection } = nestScent;
              if (
                hasFood &&
                !ant.recentlyVistedScentParticles.includes(id) &&
                (antId === ant.id || strength > followedScendAge || !followedScent)
              ) {
                followedScent = normalizeRadians(pointsToDirection);
                followedScendAge = strength;
                ant.recentlyVistedScentParticles.push(id);
              }
              break;

            default:
              break;
          }
          /* eslint-enable indent */
        }
      }

      if (ant.recentlyVistedScentParticles.length > 127) ant.recentlyVistedScentParticles.shift();

      if (leftMouseDown) {
        // targetRotation = ant.getRotationAtPoint(xMouse, yMouse);
      } else {
        targetRotation +=
          ant.rotationSign > 0
            ? Math.sin(deltaTime * Math.random() * (followedScent ? 1.5 : 3))
            : -Math.sin(deltaTime * Math.random() * (followedScent ? 1.5 : 3));

        if (ant.rotationSignChangeTimer.update(deltaTime)) {
          ant.rotationSign *= -1;
          if (!followedScent)
            speed = clamp(randomInRange(hasFood ? maxSpeed * 0.5 : 0, maxSpeed), 0, maxSpeed);
        }

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
      ant.foundFood = foundFood;
      ant.followedScendAge = followedScendAge;

      // debug: test if the ant is on screen
      if (ant.x > 0 && ant.y > 0 && ant.x < worldWidth && ant.y < worldHeight)
        antsOnScreenCounter++;
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
        getRadiansFromPointAtoB(xMouse, yMouse, lastMouseSpawn.x, lastMouseSpawn.y),
      );
      collisions.insert(scent.body);
      app.stage.addChild(scent);
      pheromones.set(scent, scent);
      mouseSpawnedPheromones.push(scent);
    }

    draw.clear();
    draw.lineStyle(1, 0x990000);
    // osbtacle.draw(draw);
    for (const bound of worldBounds) {
      bound.draw(draw);
    }
    // collisions.draw(draw);

    if (debugLogTimer.update(deltaTime)) {
      updateFPSDisplay(deltaTime);
      updateAntsCounter(ants.length, ants.length - antsOnScreenCounter);
    }

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
        randomInRange(70, 80),
      );

      ants.push(ant);
      collisions.insert(ant.body as Shape);
      particles.addChild(ant);
      if (ants.length < numberOfAnts) releaseTheAnts();
    }, 30);
  }

  releaseTheAnts();
};
