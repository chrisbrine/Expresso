const express = require('express');

const menuRouter = express.Router();

const menuitemsRouter = require('./menuitems');

const sqlite3 = require('sqlite3');

const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');

/*-------
MENU ROUTER
--------*/

// PARAMS
menuRouter.param('menuId', (req, res, next, menuId) => {
  const sql = 'SELECT * FROM Menu WHERE id = $id';
  // Protect against SQL Injections
  const values = {$id: menuId};
  db.get(sql, values, (err, menu) => {
    if(err) {
      next(err);
    } else if(menu) {
      // The menu actually exists, attach it to req so .get('/:id') doesn't have to search again
      req.menu = menu;
      if(req.method === 'DELETE' && !req.url.includes('/menu-items')) {
        // Make sure that this menu has no attached menu items on delete
        db.all('SELECT * FROM MenuItem WHERE menu_id = $id', {$id: menuId}, (err, data) => {
          if(data.length > 0) { 
          // There are existing menu items! Don't delete!
            res.sendStatus(400);
          } else {
            next();
            // We're good.
          }
        });
      } else {
        next();
      }
    } else {
      res.sendStatus(404);
    }
  });
});

// MIDDLEWARE
const menuValidator = (req, res, next) => {
  // Ensure that all required data has been provided
  const menu = req.body.menu;
  if(!menu.title) {
    return res.sendStatus(400);
  }
  next();
}

// MENU ITEMS
menuRouter.use('/:menuId/menu-items', menuitemsRouter);

// GET
menuRouter.get('/', (req, res, next) => {
  // Get menus
  const sql = 'SELECT * FROM Menu';
  db.all(sql, (err, data) => {
    // Handle any errors
    if(err) {
      next(err);
    } else {
      // Send back menus as JSON object
      res.status(200).json({menus: data})
    }
  });
});

menuRouter.get('/:menuId', (req, res, next) => {
  res.status(200).json({menu: req.menu});
});

// POST
menuRouter.post('/', menuValidator, (req, res, next) => {
  // Get menus from req, prepare sql & values
  const menu = req.body.menu;
  const sql = `INSERT INTO Menu(title) VALUES ($title)`;
  const values = {
    $title: menu.title
  };
  db.run(sql, values, function(err) {
    // Handle any errors
    if(err) {
      next(err);
    }
    // Ensure the menu was inserted into the database
    db.get(`SELECT * FROM Menu WHERE id = ${this.lastID}`, (err, data) => {
      res.status(201).json({menu: data});
    });
  });
});

// PUT
menuRouter.put('/:menuId', menuValidator, (req, res, next) => {
  const menu = req.body.menu;
  // Protect against SQL injections
  const sql = 'UPDATE Menu SET title = $title WHERE Menu.id = $id';
  const values = {
    $title: menu.title,
    $id: req.params.menuId
  };
  db.run(sql, values, function(err) {
    // Handle any errors
    if(err) {
      next(err);
    }
    // Ensure the update was applied to the database
    db.get('SELECT * FROM Menu WHERE id = $id', {$id: req.params.menuId}, (err, data) => {
      res.status(200).json({menu: data});
    });
  });
});

// DELETE
menuRouter.delete('/:menuId', (req, res, next) => {
  // Protect against SQL injections
  const sql = 'DELETE FROM Menu WHERE Menu.id = $id';
  const values = {$id: req.params.menuId};
  db.run(sql, values, (err) => {
    if(err) {
      next(err);
    }
    res.sendStatus(204);
  });
});

module.exports = menuRouter;