# blog-server

A blog REST API server developed by Boris HUISGEN <bhuisgen@hbis.fr>

Under GNU GPL licence.

# Getting Started

Getting blog-server

The latest release and setup instructions are available at GitHub.

## Building

	git clone https://github.com/bhuisgen/blog-server.git
	cd blog-server
	bower install
	npm install

## Configuration

Edit these files:

- config/content.js: to configure static content directories
- config/database.js: to configure your database storage settings
- config/keys.js: to add your authentication keys of external authentication providers
- config/server.js: to configure the REST API server

## Running

You need to initialize your blog instance before adding any content :

	node bin/shell init

This process will ask you the administrator credentials of the instance. It will give you the anonymous API key needed for the client application. 

To run the REST API server:

	cd blog-server

	grunt serve

To create a new page:

	node bin/shell create --page

	vim content/pages/newpage.md

To store/update pages in index:

	node bin/shell store --pages --verbose
