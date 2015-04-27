FROM debian:jessie
MAINTAINER Boris HUISGEN <bhuisgen@hbis.fr>

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get -y update
RUN apt-get -y upgrade

RUN apt-get -y install locales
RUN dpkg-reconfigure locales && locale-gen C.UTF-8 && /usr/sbin/update-locale LANG=C.UTF-8
RUN echo 'en_US.UTF-8 UTF-8' >> /etc/locale.gen && locale-gen
ENV LC_ALL C.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US.UTF-8

RUN apt-get -y install ucf procps iproute

RUN apt-get -y install  supervisor
COPY etc/supervisor/ /etc/supervisor/

RUN apt-get -y install build-essential curl git imagemagick jq redis-server
COPY etc/redis/ /etc/redis/
COPY files/n/bin/n /usr/local/bin/n

RUN git clone https://github.com/bhuisgen/blog-server.git /var/www/ 
WORKDIR /var/www
COPY files/config /var/www/config/

RUN n $(jq ".engines.node" package.json|sed -ne 's/[^0-9]*\(\([0-9]\.\)\{0,4\}[0-9][^.]\).*/\1/p')
RUN npm update npm -g
RUN npm install
RUN npm install jugglingdb-redis

COPY run.sh /
RUN chmod +x /run.sh

ENV NODE_ENV production
ENV PORT 3000
EXPOSE 3000
ENTRYPOINT ["/run.sh"]
CMD [""]
