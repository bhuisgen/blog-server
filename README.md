# blog-server

A blog REST API server developed by Boris HUISGEN <bhuisgen@hbis.fr>

Under GNU GPL licence

## Getting blog-server

	$ git clone https://github.com/bhuisgen/blog-server.git
	$ cd blog-server

## Building

Redis is needed to cache server data:

	# apt-get install redis-server

By default, Redis is used to store your blog content but you can use a different backend.

To use PostgreSQL database:

	# apt-get install postgresql-server-<VERSION> postgresql-server-dev-<VERSION>

Install the dependencies:

	$ bower install
	$ npm install

To use PostgreSQL install this backend storage:

	$ npm install jugglingdb-postgres --save

You can now build your instance:

	$ grunt build

## Configuration

Edit these files:

- *config/content.js*: to configure local content directories
- *config/database.js*: to configure your backend storage
- *config/keys.js*: to add your API keys for external authentication
- *config/server.js*: to configure the REST API server

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

	$ node bin/shell purge

To purge all posts in database:

	$ node bin/shell purge
