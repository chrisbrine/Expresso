const express = require('express');

const timesheetsRouter = express.Router();

const sqlite3 = require('sqlite3');

const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');

/*-------
TIMESHEET ROUTER
--------*/

// PARAMS
timesheetsRouter.param('timesheetId', (req, res, next, timesheetId) => {
  const sql = 'SELECT * FROM Timesheet WHERE id = $id';
  // Protect against SQL Injections
  const values = {$id: timesheetId};
  db.get(sql, values, (err, timesheet) => {
    if(err) {
      next(err);
    } else if(timesheet) {
      // The timesheet actually exists, attach it to req so .get('/:id') doesn't have to search again
      req.timesheet = timesheet;
      next();
    } else {
      res.sendStatus(404);
    }
  });
});

// MIDDLEWARE
const timesheetValidator = (req, res, next) => {
  // Ensure that all required data has been provided
  const timesheet = req.body.timesheet;
  if(!timesheet.date || !timesheet.hours || !timesheet.rate) {
    return res.sendStatus(400);
  }
  next();
}

// GET
timesheetsRouter.get('/', (req, res, next) => {
  // Get timesheets that belong to employee
  const sql = 'SELECT * FROM Timesheet WHERE employee_id = $employeeId';
  const values = {$employeeId: req.employee.id};
  db.all(sql, values, (err, data) => {
    if(err) {
      next(err);
    } else {
      // Return timesheets belonging to employee
      res.status(200).json({timesheets: data})
    }
  });
});

// PUT
timesheetsRouter.put('/:timesheetId', timesheetValidator, (req, res, next) => {
  // UPDATE specific timesheet
  const timesheet = req.body.timesheet;
  const sql = 'UPDATE Timesheet SET hours = $hours, rate = $rate, date = $date, employee_id = $employee_id WHERE id = $id';
  const values = {
    $hours: timesheet.hours,
    $rate: timesheet.rate,
    $date: timesheet.date,
    $employee_id: req.employee.id,
    $id: req.params.timesheetId
  };
  db.run(sql, values, function(err) {
    // Handle any errors
    if(err) {
      next(err);
    }
    // Ensure the update was applied to the database
    db.get('SELECT * FROM Timesheet WHERE id = $id', {$id: req.params.timesheetId}, (err, data) => {
      res.status(200).json({timesheet: data});
    });
  });
});

// POST
timesheetsRouter.post('/', timesheetValidator, (req, res, next) => {
  // UPDATE specific timesheet
  const timesheet = req.body.timesheet;
  const sql = 'INSERT INTO Timesheet (hours, rate, date, employee_id) VALUES ($hours, $rate, $date, $employee_id)';
  const values = {
    $hours: timesheet.hours,
    $rate: timesheet.rate,
    $date: timesheet.date,
    $employee_id: req.employee.id
  };
  db.run(sql, values, function(err) {
    // Handle any errors
    if(err) {
      next(err);
    }
    // Ensure the update was applied to the database
    db.get(`SELECT * FROM Timesheet WHERE id = ${this.lastID}`, (err, data) => {
      res.status(201).json({timesheet: data});
    });
  });
});

// DELETE
timesheetsRouter.delete('/:timesheetId', (req, res, next) => {
  // Protect against SQL injections
  const sql = 'DELETE FROM Timesheet WHERE id = $id';
  const values = {$id: req.params.timesheetId};
  db.run(sql, values, (err) => {
    if(err) {
      next(err);
    }
    // Timesheet successfully deleted
    res.sendStatus(204);
  });
});

module.exports = timesheetsRouter;