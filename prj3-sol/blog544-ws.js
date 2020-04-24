import assert from 'assert';
import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import querystring from 'querystring';

import BlogError from './blog-error.js';

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;

export default function serve(port, meta, model) {
  const app = express();
  app.locals.port = port;
  app.locals.meta = meta;
  app.locals.model = model;
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}

function setupRoutes(app) {
  app.use(cors());
  app.use(bodyParser.json());
  //@TODO
  app.get(``, doGetUrl(app));
  app.get(`/meta`, doGetMeta(app));
  app.get(`/users`, doFind(app, "users"));
  app.get(`/articles`, doFind(app, "articles"));
  app.get(`/comments`, doFind(app, "comments"));
  app.get(`/users/:id`, doFindId(app, "users"));
  app.get(`/articles/:id`, doFindId(app, "articles"));
  app.get(`/comments/:id`, doFindId(app, "comments"));
  app.post(`/users/:id`, doCreate(app, "users"));
  app.post(`/articles/:id`, doCreate(app, "articles"));
  app.post(`/comments/:id`, doCreate(app, "comments"));
  app.delete(`/users/:id`, doRemove(app, "users"));
  app.delete(`/articles/:id`, doRemove(app, "articles"));
  app.delete(`/comments/:id`, doRemove(app, "comments"));
  app.patch(`/users/:id`, doUpdate(app, "users"));
  app.patch(`/articles/:id`, doUpdate(app, "articles"));
  app.patch(`/comments/:id`, doUpdate(app, "comments"));
}

/****************************** Handlers *******************************/

//@TODO
function doGetUrl(app) {
  return errorWrap(async function(req, res) {
    try {
      const url = requestUrl(req);
      const results = {"links":[requestLink("self", "self", url),
        requestLink("describedby", "meta", url+"/meta"),
        requestLink("collection", "users", url+"/users"),
        requestLink("collection", "articles", url+"/articles"),
        requestLink("collection", "comments", url+"/comments")
      ]}
      res.json(results);
    }
    catch (err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

function doGetMeta(app) {
  return errorWrap(async function(req, res) {
    try {
      var results = await app.locals.meta;
      results.links = [requestLink("self", "self", requestUrl(req))]; 
      res.json(results);
    }
    catch (err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

function doFind(app, category) {
  return errorWrap(async function(req, res) {
    try {
      var categoryRes = await app.locals.model.find(category, req.query);
      if (categoryRes.length === 0) {
        throw {
          isDomain: true,
          errorCode: 'NOT_FOUND',
          message: `user ${id} not found`,
	      };
      }
      else {
        const url = requestUrl(req);
        const urlQuery = requestUrlQuery(req);
        var links = [];
        var results = {};
        var tempRes;
        var tempReq = Object.assign(req.query, req.query);

        for (var element of categoryRes) {
          element.links = [requestLink("self", "self", url+'/'+element.id)];
        }
        
        if (req.query._index === undefined) {
          if (req.query === undefined) {
            links.push(requestLink("next", "next", urlQuery+"?_index=1"));
          }
          else {
            links.push(requestLink("next", "next", urlQuery+"&_index=1"));
          }

          tempReq._index = 1;
          tempRes = await app.locals.model.find(category, tempReq);

          if (tempRes.length > 0) {
            if (req.query._count === undefined) {
              results.next = DEFAULT_COUNT;
            }
            else {
              results.next = req.query._count;
            }
          }
        }
        else {
          var tempUrl = Object.assign(urlQuery, urlQuery);

          if (req.query._index !== 0) {
            var tempUrl2 = Object.assign(urlQuery, urlQuery);

            links.push(requestLink("prev", "prev", tempUrl2.replace("_index="+req.query._index, "_index="+(parseInt(req.query._index)-1))));
            results.prev = req.query._count * (parseInt(req.query._index)-1);
          }
          
          links.push(requestLink("next", "next", tempUrl.replace("_index="+req.query._index, "_index="+(parseInt(req.query._index)+1))));
          
          tempReq._index++;
          tempRes = await app.locals.model.find(category, tempReq);

          if (tempRes.length > 0) {
            if (req.query._count === undefined) {
              results.next = DEFAULT_COUNT * (parseInt(req.query._index)+1);
            }
            else {
              results.next = req.query._count * (parseInt(req.query._index)+1);
            }
          }
        }

        links.push(requestLink("self", "self", urlQuery));

        results[category] = categoryRes;
        results.links = links;
      	res.json(results);
      }
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

function doFindId(app, category) {
  return errorWrap(async function(req, res) {
    try {
      var categoryRes = await app.locals.model.find(category, req.params);
      if (categoryRes.length === 0) {
        throw {
          isDomain: true,
          errorCode: 'NOT_FOUND',
          message: `user ${id} not found`,
        };
      }
      else {
        var results = {};
        categoryRes[0].links = [requestLink("self", "self", requestUrlQuery(req))];
        results[category] = categoryRes;
      	res.json(results);
      }
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

function doCreate(app, category) {
  return errorWrap(async function(req, res) {
    try {
      const results = await app.locals.model.create(category, req.body);
      res.sendStatus(CREATED);
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

function doRemove(app, category) {
  return errorWrap(async function(req, res) {
    try {
      const results = await app.locals.model.remove(category, req.params);
      res.sendStatus(OK);
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

function doUpdate(app, category) {
  return errorWrap(async function(req, res) {
    try {
      const patch = Object.assign(req.body, req.body);
      patch.id = req.params.id;
      console.log(patch);
      const results = app.locals.model.update(category, patch);
      res.sendStatus(OK);
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}


/**************************** Error Handling ***************************/

/** Ensures a server error results in nice JSON sent back to client
 *  with details logged on console.
 */ 
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

const ERROR_MAP = {
  BAD_CATEGORY: NOT_FOUND,
  EXISTS: CONFLICT,
}

/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code.
 */
function mapError(err) {
  console.error(err);
  return (err instanceof Array && err.length > 0 && err[0] instanceof BlogError)
    ? { status: (ERROR_MAP[err[0].code] || BAD_REQUEST),
	code: err[0].code,
	message: err.map(e => e.message).join('; '),
      }
    : { status: SERVER_ERROR,
	code: 'INTERNAL',
	message: err.toString()
      };
} 

/****************************** Utilities ******************************/

/** Return original URL for req (excluding query params)
 *  Ensures that url does not end with a /
 */
function requestUrl(req) {
  const port = req.app.locals.port;
  const url = req.originalUrl.replace(/\/?(\?.*)?$/, '');
  return `${req.protocol}://${req.hostname}:${port}${url}`;
}

function requestUrlQuery(req) {
  const port = req.app.locals.port;
  const url = req.originalUrl;
  return `${req.protocol}://${req.hostname}:${port}${url}`;
}

function requestLink(rel, name, url) {
  return {"rel":rel, "name":name, "url":url};
}


const DEFAULT_COUNT = 5;

//@TODO
