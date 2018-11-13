FROM lambci/lambda:build-nodejs8.10

RUN yum update --assumeyes --skip-broken && \
      yum install --assumeyes libjpeg-devel libjpeg-turbo-static glibc-static && \
      yum install --assumeyes git git-lfs && \
      yum clean all

RUN git clone https://github.com/mm2/Little-CMS.git && \
      cd Little-CMS && \
      ./configure --prefix=/usr && \
      make && \
      make install && \
      cd .. && \
      rm -rf Little-CMS

## following copied for consistency
CMD ["npm", "rebuild"] 
