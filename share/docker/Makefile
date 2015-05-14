DOCKER_REPOSITORY=bhuisgen
DOCKER_IMAGE=blog-server

GIT_BRANCH=$(shell git rev-parse --abbrev-ref HEAD)
GIT_COMMIT=$(shell git rev-parse HEAD)

BUILD_TAG=$(GIT_BRANCH)

all: build

.PHONY: build clean mrproper

build:
	sed 's/$$GIT_BRANCH/$(GIT_BRANCH)/g;s/$$GIT_COMMIT/$(GIT_COMMIT)/g' Dockerfile.in > Dockerfile
	docker build -t $(DOCKER_REPOSITORY)/$(DOCKER_IMAGE):$(BUILD_TAG) .

clean:
	rm -f Dockerfile

mrproper:
	rm -f Dockerfile
