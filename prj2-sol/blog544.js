// -*- mode: JavaScript; -*-

import mongo from 'mongodb';

import BlogError from './blog-error.js';
import Validator from './validator.js';

//debugger; //uncomment to force loading into chrome debugger

/**
A blog contains users, articles and comments.  Each user can have
multiple Role's from [ 'admin', 'author', 'commenter' ]. An author can
create/update/remove articles.  A commenter can comment on a specific
article.

Errors
======

DB:
  Database error

BAD_CATEGORY:
  Category is not one of 'articles', 'comments', 'users'.

BAD_FIELD:
  An object contains an unknown field name or a forbidden field.

BAD_FIELD_VALUE:
  The value of a field does not meet its specs.

BAD_ID:
  Object not found for specified id for update/remove
  Object being removed is referenced by another category.
  Other category object being referenced does not exist (for example,
  authorId in an article refers to a non-existent user).

EXISTS:
  An object being created already exists with the same id.

MISSING_FIELD:
  The value of a required field is not specified.

*/

export default class Blog544 {

  constructor(meta, options, client, db) {
    //@TODO
    this.meta = meta;
    this.options = options;
    this.client = client;
    this.db = db;
    this.validator = new Validator(meta);
  }

  /** options.dbUrl contains URL for mongo database */
  static async make(meta, options) {
    //@TODO
    var db;
    
    if(options.dbUrl.match(/mongodb:\/\/localhost:[0-9]+/))
    {
      //var name = 
      var client = await mongo.connect(options.dbUrl, MONGO_CONNECT_OPTIONS);

      db = client.db();

      //db.collection("users").createIndexes({"id":1, "email":1, "firstName":1, "lastName":1, "roles":1, "creationTime":-1, "updateTime":1});
      //db.collection("articles").createIndexes({"id":1, "title":1, "content":1, "authorId":1, "creationTime":-1, "updateTime":1, "keywords":1});
      //db.collection("comments").createIndexes({"id":1, "content":1, "articleId":1, "commenterId":1, "creationTime":-1, "updateTime":1});
      
    }
    else
    {
      throw[new BlogError("BAD_URL", msg)];
    }

    return new Blog544(meta, options, client, db);
  }

  /** Release all resources held by this blog.  Specifically, close
   *  any database connections.
   */
  async close() {
    //@TODO
    await this.client.close();
  }

  /** Remove all data for this blog */
  async clear() {
    //@TODO
    await this.db.dropDatabase();
  }

  /** Create a blog object as per createSpecs and 
   * return id of newly created object 
   */
  async create(category, createSpecs) {
    const obj = this.validator.validate(category, 'create', createSpecs);
    //@TODO
    var id;

    if (createSpecs.id === undefined)
    {
      do
      {
        id = Math.floor(Math.random(this.seed) * Number.MAX_SAFE_INTEGER).toString();
        var found = await this.db.collection(category).find({"id":id}).toArray();

      } while(found.length > 0);
    }
    else
    {
      id = createSpecs.id;
    }
    
    var found = await this.db.collection(category).find({"id":id}).toArray()

    if(found.length > 0)
    {
      const msg = "object with id " + id + " already exists for " + category;
      throw[new BlogError("EXISTS", msg)];
    }
    else
    {
      obj.id = id;
    
      this.db._id = id;
      this.db.collection(category).insertOne(obj);
    }

    return id;
  }

  /** Find blog objects from category which meets findSpec.  
   *
   *  First returned result will be at offset findSpec._index (default
   *  0) within all the results which meet findSpec.  Returns list
   *  containing up to findSpecs._count (default DEFAULT_COUNT)
   *  matching objects (empty list if no matching objects).  _count .
   *  
   *  The _index and _count specs allow paging through results:  For
   *  example, to page through results 10 at a time:
   *    find() 1: _index 0, _count 10
   *    find() 2: _index 10, _count 10
   *    find() 3: _index 20, _count 10
   *    ...
   *  
   */
  async find(category, findSpecs={})
  {
    const obj = this.validator.validate(category, 'find', findSpecs);
    //@TODO
    var count;
    var index;
    var array;
    var ret;

    if (findSpecs._count === undefined)
    {
      count = DEFAULT_COUNT;
    }
    else
    {
      count = parseInt(findSpecs._count);
    }

    if (findSpecs._index === undefined)
    {
      index = 0;
    }
    else
    {
      index = parseInt(findSpecs._index);
    }

    if(findSpecs.creationTime !== undefined)
    {
      //findSpecs.creationTime = {"creationTime":{$lte: findSpecs.creationTime}};
    }
    
    findSpecs._index=undefined;
    findSpecs._count=undefined;

    array = await this.db.collection(category).find(findSpecs).toArray();

    //console.log(array);
    ret = array.slice(index*count, index*count + count);
    //console.log(ret);
    return ret;
  }

  /** Remove up to one blog object from category with id == rmSpecs.id. */
  async remove(category, rmSpecs)
  {
    const obj = this.validator.validate(category, 'remove', rmSpecs);
    //@TODO
    var id;
    var array;

    //id = rmSpecs.id;
    //array = await this.find(category, {id:rmSpecs.id});
    //console.log(array);
    

    //array = find(category, rmSpecs);

    if (category === "users")
    {
      var users = await this.find("users", rmSpecs);

      if (users.length > 0)
      {
        var id = users[0].id;
        var articleSpecs = Object.assign({}, rmSpecs);
        var commentSpecs = Object.assign({}, rmSpecs);
        
        articleSpecs.authorId = id;
        commentSpecs.commenterId = id;

        var articles = await this.find("articles", articleSpecs);
        var comments = await this.find("comments", commentSpecs);
        var articleValid = true;
        var commentValid = true;

        if (articles.length === 0 && comments.length === 0)
        {
          await this.db.collection(category).deleteOne(rmSpecs);
        }
        else
        {
          var msg = "";

          if (!articleValid)
          {
            var ids = [];

            for (var i = 0; i < articles.length; i++)
            {
              ids.push(articles[i].id);
            }

            msg += "\nuser " + id + " referenced by authorId for articles : " + ids.join(", ");
          }
  
          if (!commentValid)
          {
            var ids = [];

            for (var i = 0; i < comments.length; i++)
            {
              ids.push(comments[i].id);
            }

            msg += "\nuser " + id + " referenced by commenterId for comments : " + ids.join(", ");
          }

          throw[new BlogError("BAD_ID", msg)];
        }
      }
    }
    else if (category === "articles")
    {
      var articles = await this.find("articles", rmSpecs);
      
      if (articles.length > 0)
      {
        var id = articles[0].id;
        var commentSpecs = Object.assign({}, rmSpecs);

        commentSpecs.articleId = articles.authorId;

        var comments = await this.find("comments", commentSpecs);
        var commentValid = true;

        if (comments.length === 0)
        {
          await this.db.collection(category).deleteOne(rmSpecs);
        }
        else
        {
          var msg = "";
          var ids = [];

          for (var i = 0; i < comments.length; i++)
          {
            ids.push(comments[i].id);
          }

          msg += "\narticle " + id + " referenced by commenterId for comments : " + ids.join(", ");

          throw[new BlogError("BAD_ID", msg)];
        }
      }
    }
    else if (category === "comments")
    {
      var comments = await this.find("comments", rmSpecs);

      if (comments.length > 0)
      {
        await this.db.collection(category).deleteOne(rmSpecs);
      }
    }
  }

  /** Update blog object updateSpecs.id from category as per
   *  updateSpecs.
   */
  async update(category, updateSpecs)
  {
    const obj = this.validator.validate(category, 'update', updateSpecs);
    //@TODO
    await this.db.collection(category).updateOne({"id":updateSpecs.id},{$set:updateSpecs});
  }
  
}

const DEFAULT_COUNT = 5;

const MONGO_CONNECT_OPTIONS = { useUnifiedTopology: true };
