# Docker blog-server

This Docker container provides an instance of blog-server with a Redis backend.

The instance is installed in the directory */var/www* and the REST API server is listening on port 3000.

## Usage

### Build the image

    # docker build -t bhuisgen/blog-server:latest .

### Run the container

    # docker run -d -p 3000:3000 --name blog-server bhuisgen/blog-server

### Manage the instance

To initialize your blog instance:

    # docker exec -ti blog-server /bin/bash

    # cd /var/www
    # node bin/shell init

You can show the anonymous user auth key:

    # node bin/shell keys --show
        Show key: email:  anonymous@localhost.localdomain
        [ { authKey: '06a7366d-a1a1-4937-9b5d-42d78095fae5',
            created: Mon Apr 27 2015 18:26:20 GMT+0000 (UTC),
            enabled: true,
            id: 1,
            userId: 1 },
          countBeforeLimit: 1 ]

To restart your instance:

    # supervisorctl restart blog-server
