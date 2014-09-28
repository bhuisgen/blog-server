# blog-server

A blog REST API server developed by Boris HUISGEN <bhuisgen@hbis.fr>

Under GNU GPL licence

## Getting blog-server

	$ git clone https://github.com/bhuisgen/blog-server.git

	$ cd blog-server

## Building

Redis is needed to cache local server data:

	# apt-get install redis-server

It is also used to store blog content but you can use a different storage like SQLite and PostgreSQL.

Install the dependencies:

	$ bower install
	$ npm install

For storing content in alternative storage than Redis:

- for SQLite storage:

		$ npm install jugglingdb-sqlite3

- for PostgreSQL storage:

		$ npm install jugglingdb-postgres

- for MySQL storage:

		$ npm install jugglingdb-mysql

You can now build your instance:

	$ grunt build

## Configuration

Configuration files description:
- *config/server.js*: server settings
- *config/keys.js*: API keys of external providers authentication
- *config/content.js*: local content settings
- *config/database.js*: backend storage settings

You must choose one content storage backend and copy the corresponding template file into *config/database.js*:

- for Redis storage:

		$ cp config/database.redis.js config/database.js

- for SQLite storage:

		$ cp config/database.sqlite.js config/database.js

- for PostgreSQL storage:

		$ cp config/database.pgsql.js config/database.js

- for MySQL storage:

		$ cp config/database.mysql.js config/database.js

## Use

You need to initialize your blog instance before adding any content:

	$ node bin/shell init

This process will ask you the administrator credentials. It will give you the API key of the user *anonymous* which is needed for the client application. 

### Running

To run the REST API server:

	$ grunt serve

### Roles management

Command help:

	$ node bin/shell roles --help

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
