const express = require('express');

const menuitemsRouter = express.Router();

const sqlite3 = require('sqlite3');

const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');

/*-------
MENUITEMS ROUTER
--------*/

// PARAMS
menuitemsRouter.param('menuItemId', (req, res, next, menuItemId) => {
  const sql = 'SELECT * FROM MenuItem WHERE id = $id';
  // Protect against SQL Injections
  const values = {$id: menuItemId};
  db.get(sql, values, (err, menuItem) => {
    if(err) {
      next(err);
    } else if(menuItem) {
      // The menu item actually exists, attach it to req so .get('/:id') doesn't have to search again
      req.menuItem = menuItem;
      next();
    } else {
      res.sendStatus(404);
    }
  });
});

// MIDDLEWARE
const menuItemValidator = (req, res, next) => {
  // Ensure that all required data has been provided
  const menuItem = req.body.menuItem;
  if(!menuItem.name || !menuItem.description || !menuItem.inventory || !menuItem.price) {
    return res.sendStatus(400);
  }
  next();
}

// GET
menuitemsRouter.get('/', (req, res, next) => {
  // Get menu items that belong to the menu
  const sql = `SELECT * FROM MenuItem WHERE menu_id = ${req.menu.id}`;
  db.all(sql, (err, data) => {
    if(err) {
      next(err);
    } else {
      // Return menu items belonging to the menu
      res.status(200).json({menuItems: data})
    }
  });
});

// PUT
menuitemsRouter.put('/:menuItemId', menuItemValidator, (req, res, next) => {
  // UPDATE specific Menu Item
  const menuItem = req.body.menuItem;
  const sql = 'UPDATE MenuItem SET name = $name, description = $description, inventory = $inventory, price = $price, menu_id = $menu_id WHERE id = $id';
  const values = {
    $name: menuItem.name,
    $description: menuItem.description,
    $inventory: menuItem.inventory,
    $price: menuItem.price,
    $menu_id: req.menu.id,
    $id: req.params.menuItemId
  };
  db.run(sql, values, function(err) {
    // Handle any errors
    if(err) {
      next(err);
    }
    // Ensure the update was applied to the database
    db.get('SELECT * FROM MenuItem WHERE id = $id', {$id: req.params.menuItemId}, (err, data) => {
      res.status(200).json({menuItem: data});
    });
  });
});

// POST
menuitemsRouter.post('/', menuItemValidator, (req, res, next) => {
  // UPDATE specific menu item
  const menuItem = req.body.menuItem;
  const sql = 'INSERT INTO MenuItem (name, description, inventory, price, menu_id) VALUES ($name, $description, $inventory, $price, $menu_id)';
  const values = {
    $name: menuItem.name,
    $description: menuItem.description,
    $inventory: menuItem.inventory,
    $price: menuItem.price,
    $menu_id: req.menu.id
  };
  db.run(sql, values, function(err) {
    // Handle any errors
    if(err) {
      next(err);
    }
    // Ensure the update was applied to the database
    db.get(`SELECT * FROM MenuItem WHERE id = ${this.lastID}`, (err, data) => {
      res.status(201).json({menuItem: data});
    });
  });
});

// DELETE
menuitemsRouter.delete('/:menuItemId', (req, res, next) => {
  // Protect against SQL injections
  const sql = 'DELETE FROM MenuItem WHERE id = $id';
  const values = {$id: req.params.menuItemId};
  db.run(sql, values, (err) => {
    if(err) {
      next(err);
    }
    // Menu Item successfully deleted
    res.sendStatus(204);
  });
});

module.exports = menuitemsRouter;