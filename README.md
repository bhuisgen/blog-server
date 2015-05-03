# Blog-server

Blog-server is a REST API blog engine developed by Boris HUISGEN.

The project is under GNU GPL licence.

## Features

- Support pages and posts with comments, tags and categories
- Content generated from static Markdown files or by REST API
- Content indexed in database (Redis, SQLite, PostgreSQL, MySQL, MongoDB)
- User permissions by groups and roles
- Client API authentication by keys or tokens
- Local authentication by user credentials
- External authentication through remote providers (Facebook, GitHub, Google, LinkedIn, Twitter)

## Getting blog-server

	$ git clone https://github.com/bhuisgen/blog-server.git

	$ cd blog-server

## Dependencies

	# apt-get install imagemagick redis-server

## Building

	$ bower install
	$ npm install

To store content in alternative storage than Redis:

- for SQLite storage:

		$ npm install jugglingdb-sqlite3

- for PostgreSQL storage:

		$ npm install jugglingdb-postgres

- for MySQL storage:

		$ npm install jugglingdb-mysql

- for MongoDB storage:

		$ npm install jugglingdb-mongodb

	$ grunt build

## Configuration

Configuration files are:

- *config/server.js*: server settings
- *config/keys.js*: API keys of external providers authentication
- *config/database.js*: storage settings
- *config/content.js*: local content settings
- *config/thumbnail.js*: image thumbnails settings

Before editing copy the templates files:

    $ cp config/server.js.dist config/server.js
    $ cp config/keys.js.dist config/keys.js

You must choose one storage backend and copy the corresponding template file into *config/database.js*:

- for Redis storage:

		$ cp config/database.js.redis config/database.js

- for SQLite storage:

		$ cp config/database.js.sqlite config/database.js

- for PostgreSQL storage:

		$ cp config/database.js.pgsql config/database.js

- for MySQL storage:

		$ cp config/database.js.mysql config/database.js

- for MongoDB storage:

		$ cp config/database.js.mongodb config/database.js

## Use

You need to initialize your instance before adding any content:

	$ node bin/shell init

This process will ask you the administrator credentials.

It will give you the API key of the user *Anonymous* which is needed for the client side application.

### Running

To run the server:

	$ grunt serve

To check the status of the REST API server you can use *curl* like this:

    $ curl --insecure https://127.0.0.1:3000/status

Some REST API calls:

    $ curl --insecure -H "Content-Type: application/json" -H "Authorization: Basic ZDJmNTI1MzctMDY0YS00NTQzLWExNDctMzVjMjRiZTYwNzVj" https://127.0.0.1:3000/api/pages/1

    $ curl --insecure -H "Content-Type: application/json" -H "Authorization: Basic ZDJmNTI1MzctMDY0YS00NTQzLWExNDctMzVjMjRiZTYwNzVj" https://127.0.0.1:3000/api/posts/1

To set offline the API server:

    $ node bin/shell variables --set

    Set variable: Name:  api.offline
    Set variable: Value:  true

## Shell command reference

To show available commands:

	$ node bin/shell --help

### Roles management

Command help:

	$ node bin/shell --help

To create a new role:

	$ node bin/shell roles --add

To remove a new role:

	$ node bin/shell roles --remove

To display all existing roles:

	$ node bin/shell roles --list

### Groups management

Command help:

	$ node bin/shell groups --help

### Users management

Command help:

	$ node bin/shell users --help

### Keys management

Command help:

	$ node bin/shell keys --help

### Blacklists management

Command help:

	$node bin/shell blacklists --help

### Variables management

Command help:

	$node bin/shell variables --help

### Content mangement

#### Create new content

Command help:

	$ node bin/shell create --help

To create a new page:

	$ node bin/shell create --page
	$ vim content/pages/newpage.md

To create a new post:

	$ node bin/shell create --post
	$ vim content/pages/newpost.md

#### Store content in database

Command help:

	$ node bin/shell store --help

To store/update all pages in database:

	$ node bin/shell store --pages --verbose

To store/update all posts in database:

	$ node bin/shell store --posts --verbose

#### Purge content in database

Command help:

	$ node bin/shell purge --help

To purge all pages in database:

	$ node bin/shell purge --pages

To purge all posts in database:

	$ node bin/shell purge --posts

#### List content in database

Command help:

    $ node bin/shell list --help

To list all pages in database:

    $ node bin/shell list --pages

To list all posts in database:

    $ node bin/shell list --posts

## Thumbnail command reference

To show available commands:

	$ node bin/thumbnail --help

To generate thumbnails of an image:

	$ node bin/thumbnail public/posts/2014/01/image.jpg
