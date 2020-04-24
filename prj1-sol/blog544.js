// -*- mode: JavaScript; -*-
const DEFAULT_COUNT = 5;

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

  constructor(meta, options) {
    this.articleMap = new Map();
    this.commentMap = new Map();
    this.userMap = new Map();
    this.seed = 1;

    this.meta = meta;
    this.options = options;
    this.validator = new Validator(meta);
  }

  static async make(meta, options) {
    //@TODO

    return new Blog544(meta, options);
  }

  /** Remove all data for this blog */
  async clear() {
    this.articleMap.clear();
    this.commentMap.clear();
    this.userMap.clear();
  }

  /** Create a blog object as per createSpecs and 
   * return id of newly created object 
   */
  async create(category, createSpecs) {
    const obj = this.validator.validate(category, 'create', createSpecs);
    //create users id=betty email=em@a firstName=fn lastName=ln roles=[author] creationTime=2019-10-26T13:05:29Z updateTime=2019-10-26T13:05:29Z
    var key;
    if (category === "users")
    {
      if(this.userMap.has(obj.id))
      {
        const msg = "object with id " + obj.id + " already exists for " + category;
        throw[new BlogError("EXISTS", msg)];
      }
      else
      {
        key = obj.id;
        console.log('"' + obj.id + '"');
        this.userMap.set(obj.id, obj);
      }
    }
    else if (category === "articles")
    {
      do
      {
        key = Math.floor(Math.random(this.seed) * Number.MAX_SAFE_INTEGER);
      } while(this.articleMap.has(obj.id));
      
      console.log('"' + key + '"');
      obj.id = key;
      this.articleMap.set(key, obj);
    }
    else if (category === "comments")
    {
      do
      {
        key = Math.floor(Math.random(this.seed) * Number.MAX_SAFE_INTEGER);
      } while(this.commentMap.has(obj.id));

      console.log('"' + key + '"');
      obj.id = key;
      this.commentMap.set(key, obj);
    }

    return key;
  }

  /** Find blog objects from category which meets findSpec.  Returns
   *  list containing up to findSpecs._count matching objects (empty
   *  list if no matching objects).  _count defaults to DEFAULT_COUNT.
   */
  async find(category, findSpecs={}) {
    const obj = this.validator.validate(category, 'find', findSpecs);
    
    var map;
    var array = [];
    
    if (category === "users")
    {
      map = new Map(this.userMap);

      for (let [k, v] of map)
      {
        if ((findSpecs.id !== undefined && findSpecs.id !== v.id) ||
        (findSpecs.firstName !== undefined && findSpecs.firstName !== v.firstName) ||
        (findSpecs.lastName !== undefined && findSpecs.lastName !== v.lastName) ||
        (findSpecs.email !== undefined && findSpecs.email !== v.email))
        {
          map.delete(k);
        }
      }
    }
    else if (category === "articles")
    {
      map = new Map(this.articleMap);

      for (let [k, v] of map)
      {
        if ((findSpecs.id !== undefined && parseInt(findSpecs.id) !== v.id) ||
        (findSpecs.authorId !== undefined && findSpecs.authorId !== v.authorId))
        {
          map.delete(k);
        }
      }
    }
    else if (category === "comments")
    {
      map = new Map(this.commentMap);

      for (let [k, v] of map)
      {
        if ((findSpecs.id !== undefined && parseInt(findSpecs.id) !== v.id) ||
        (findSpecs.articleId !== undefined && findSpecs.articleId !== v.articleId) ||
        (findSpecs.commenterId !== undefined && findSpecs.commenterId !== v.commenterId))
        {
          map.delete(k);
        }
      }
    }
    
    var count = 0;

    if (findSpecs._count === undefined)
    {
      findSpecs._count = DEFAULT_COUNT;
    }

    for (let v of map.values())
    {
      if (count < findSpecs._count)
      {
        count++;
        array.push(v);
      }
    }

    return array;
  }

  /** Remove up to one blog object from category with id == rmSpecs.id. */
  async remove(category, rmSpecs) {
    const obj = this.validator.validate(category, 'remove', rmSpecs);

    if (category === "users")
    {
      var users = await this.find("users", rmSpecs);

      if (users.length > 0)
      {
        var id = users[0].id;
        var articleSpecs = {...rmSpecs};
        var commentSpecs = {...rmSpecs};

        articleSpecs.id = undefined;
        articleSpecs.authorId = id;
        commentSpecs.id = undefined;
        commentSpecs.commenterId = id;

        var articles = await this.find("articles", articleSpecs);
        var comments = await this.find("comments", commentSpecs);
        var articleValid = true;
        var commentValid = true;

        if (articles.length > 0)
        {
          articleValid = false;

          console.log("authorId: " + articles.length);
        }
        if (comments.length > 0)
        {
          commentValid = false;

          console.log("CommenterId: " + comments.length);
        }

        if (articleValid && commentValid)
        {
          this.userMap.delete(id);
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
        var commentSpecs = {...rmSpecs};

        commentSpecs.id = undefined;
        commentSpecs.articleId = articles.authorId;

        var comments = await this.find("comments", commentSpecs);
        var commentValid = true;
        
        if (comments.length > 0)
        {
          commentValid = false;

          console.log("CommenterId: " + comments.length);
        }

        if (commentValid)
        {
          this.articleMap.delete(id);
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
      var comments = await this.find("articles", rmSpecs);
      console.log(articles.length);

      if (comments.length > 0)
      {
        var id = comments[0].id;

        this.articleMap.delete(id);
      }
    }
  }

  /** Update blog object updateSpecs.id from category as per
   *  updateSpecs.
   */
  async update(category, updateSpecs) {
    const obj = this.validator.validate(category, 'update', updateSpecs);
    
    if (category === "users")
    {
      var value = this.userMap.get(updateSpecs.id);
      
      if (value !== undefined)
      {
        if (updateSpecs.email !== undefined)
        {
          value.email = updateSpecs.email;
        }
        if (updateSpecs.firstName !== undefined)
        {
          value.firstName = updateSpecs.firstName;
        }
        if (updateSpecs.lastName !== undefined)
        {
          value.lastName = updateSpecs.lastName;
        }
        if (updateSpecs.roles !== undefined)
        {
          value.roles = updateSpecs.roles;
        }
        if (updateSpecs.updateTime !== undefined)
        {
          value.updateTime = updateSpecs.updateTime;
        }
      }
    }
    else if (category === "articles")
    {
      var value = this.articleMap.get(parseInt(updateSpecs.id));
      
      if (value !== undefined)
      {
        if (updateSpecs.title !== undefined)
        {
          value.title = updateSpecs.title;
        }
        if (updateSpecs.content !== undefined)
        {
          value.content = updateSpecs.content;
        }
        if (updateSpecs.updateTime !== undefined)
        {
          value.updateTime = updateSpecs.updateTime;
        }
        if (updateSpecs.keywords !== undefined)
        {
          value.keywords = updateSpecs.keywords;
        }
      }
    }
    else if (category === "comments")
    {
      var value = this.commentMap.get(parseInt(updateSpecs.id));
      
      if (value !== undefined)
      {
        if (updateSpecs.content !== undefined)
        {
          value.content = updateSpecs.content;
          console.log(1);
        }
        if (updateSpecs.updateTime !== undefined)
        {
          value.updateTime = updateSpecs.updateTime;
        }
      }
    }
  }
}

//You can add code here and refer to it from any methods in Blog544.
