const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');


const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;

function serve(port, base, model) {
  const app = express();
  app.locals.port = port;
  app.locals.base = base;
  app.locals.model = model;
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}

module.exports = {
  serve: serve
}

function setupRoutes(app) {
  const base = app.locals.base;
  app.use(cors());
  app.use(bodyParser.json());

  //routes for specific urls:
  //@TODO: set up routes for specific urls
  
  app.get(`${base}/x-url?:url`, dogetRequestUrl(app));
  app.post(`${base}/x-url?:url`, doRequestUrl(app));
  app.delete(`${base}/x-url?:url`, dodeleteRequestUrl(app));
  app.post(`${base}/x-text`, dotextUrl(app));
  app.get(`${base}/:url`, getRequestUrl(app));
  //error route
  app.use(doErrors()); //must be last   
}


//@TODO add handlers for routes set up above.  Typical handler
//will be wrapped using errorWrap() to ensure that errors
//don't slip past the seams of any try-catch blocks within the
//handlers.  So a typical handler may look like:
//function doSomething(app) {
//  return errorWrap(async function(req, res) {
//    //do something typically within a try-catch
//   });
//}

/** Ensures a server error results in nice JSON sent back to client
 *  with details logged on console.
 */ 
function doRequestUrl(app)
{
	return errorWrap(async function(req, res){
		try{
			const query = req.query;
			const url = query.url;
			const result = await app.locals.model.add(url);
			res.status(CREATED).json(result);
		}catch(err){
			 const mapped = mapError(err);
      		 res.status(mapped.status).json(mapped);
		}
		
	});
}

function dotextUrl(app)
{
	return errorWrap(async function(req, res){
		try{
			const regex = new RegExp(/((https?)\:\/\/)[a-zA-Z0-9\.\/\?\:@\-_=#]+\.([a-zA-Z0-9\&\.\/\?\:@\-_=#])*/,'gi');
			let text = req.body.text;
			const url = text.match(regex);
			for(match of url){
			let regexp = new RegExp(match,'gi');
			if(text.match(regexp)){
				const result = await app.locals.model.add(match);
				const value = result.value;
				text = text.replace(regexp,value);
			}	
			}
			let result =new Object();
			result.value = text;
			res.status(CREATED).json(result);
		}catch(err){
			 const mapped = mapError(err);
      		 res.status(mapped.status).json(mapped);
		}
	});
}
function dogetRequestUrl(app)
{
	return errorWrap(async function(req, res){
		try{
			const query = req.query;
			const url = query.url;
			const result = await app.locals.model.info(url);
			res.status(OK).json(result);
		}catch(err){
			 const mapped = mapError(err);
      		 res.status(mapped.status).json(mapped);
		}
		
	});
}

function dodeleteRequestUrl(app)
{
	return errorWrap(async function(req, res){
		try{
			const query = req.query;
			const url = query.url;
			const result = await app.locals.model.deactivate(url);
			res.status(OK).json('OK');	
		}catch(err){
			 const mapped = mapError(err);
      		 res.status(mapped.status).json(mapped);
		}
	});
}


function getRequestUrl(app)
{
	return errorWrap(async function(req, res){
		try{
			const url = req.url;
			console.log(url);
			const short_url = requestUrl(req);
			const result = await app.locals.model.query(short_url);
			//console.log(result);
			res.redirect(result.value);
		}catch(err){
			 const mapped = mapError(err);
      		 res.status(mapped.status).json(mapped);
		}
		
	});
}

function doErrors(app) {
  return async function(err, req, res, next) {
    res.status(SERVER_ERROR);
    res.json({ code: 'SERVER_ERROR', message: err.message });
    console.error(err);
  };
}

/** Set up error handling for handler by wrapping it in a 
 *  try-catch with chaining to error handler on error.
 */
function errorWrap(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    }
    catch (err) {
      next(err);
    }
  };
}

/*************************** Mapping Errors ****************************/

const ERROR_MAP = {
  EXISTS: CONFLICT,
  NOT_FOUND: NOT_FOUND
}

/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code.
 */
function mapError(err) {
  console.error(err);
  return err.code
    ? { status: (ERROR_MAP[err.code] || BAD_REQUEST),
	code: err.code,
	message: err.message
      }
    : { status: SERVER_ERROR,
	code: 'INTERNAL',
	message: err.toString()
      };
} 

/****************************** Utilities ******************************/

/** Return original URL for req */
function requestUrl(req) {
  const port = req.app.locals.port;
  return `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
}
  
