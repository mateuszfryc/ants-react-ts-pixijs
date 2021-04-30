### Ants behavior

- [x] walking
  - [x] random direction
  - [x] collisions
    - [x] bouncing of the walls
    - [x] changing directions
    - [x] following rotation
- [x] picking up food
- [x] leaving scent
  - [x] scent of the nest
  - [x] scent of food
- [x] following scent

  - [ ] once the scent is found selection of the right direction

- [ ] bringing food back to the nest

  - [ ] following own scent
  - [ ] finding the nest when there is no own scent

- [ ] pheromones

  - [x] nest
  - [x] food
  - [ ] danger (released uppon death, this would have to work differently, meaby have bigger radius)
  - [ ] defend the nest
  - [ ] take care for the nest

- [ ] class extending Sprite with preset defaults that currently are being set in runtime

  - [ ] scale (mostly for pheromone sprites, since there is a huge number of them in each frame)
  - [ ] anchor

- [ ] check if it would make sens to change collisions class to just functions exported from collisions module: addCircle, addPolygon, insert, remove and isColliding
- [ ] try to store position and velocity as int8. This could be achived by multiplying float by 100 and than pluging it into int8, which will cut not needed digits. Before using it, it could be divided by 100 and saved as local float for update function

- [ ] separate collision systems? If yes: how to distribute shapes between them?
- [ ] collision test under circle created at run time? findCollisionsInCircle? Is there faster way to test circle collision than creating them before the simulation?
- [ ] remove collision result object and return array / undefined instead
- [ ] should ants sensors prioritise lower or higher scent values?
