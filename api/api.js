const express = require('express');

const apiRouter = express.Router();

const employeeRouter = require('./employees');
apiRouter.use('/employees', employeeRouter);

const menuRouter = require('./menus');
apiRouter.use('/menus', menuRouter);

module.exports = apiRouter;