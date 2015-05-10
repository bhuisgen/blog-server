DOCKER_REPOSITORY=bhuisgen
DOCKER_IMAGE=blog-server

GIT_BRANCH=$(shell git rev-parse --abbrev-ref HEAD)
GIT_COMMIT=$(shell git rev-parse HEAD)

BUILD_TAG=$(GIT_BRANCH)

all: deploy

deploy:
	GIT_BRANCH=$(GIT_BRANCH) \
	GIT_COMMIT=$(GIT_COMMIT) \
		eval "echo \"$$(cat Dockerfile.in)\"" > Dockerfile
	docker build -t $(DOCKER_REPOSITORY)/$(DOCKER_IMAGE):$(BUILD_TAG) .

.PHONY: clean mrproper

clean:

mrproper:
	rm -f Dockerfile
