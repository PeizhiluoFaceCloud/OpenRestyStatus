#Dockerfile
#FROM openresty_face/base:v0.01
FROM daocloud.io/peizhiluo007/openresty:latest
MAINTAINER peizhiluo007<25159673@qq.com>

#����supervisor������������
#�����ļ���·���仯��(since Supervisor 3.3.0)
COPY supervisord.conf /etc/supervisor/supervisord.conf
COPY status_lua/ /xm_workspace/xmcloud3.0/status_lua/
COPY https_cert/ /xm_workspace/xmcloud3.0/https_cert/
RUN	chmod 777 /xm_workspace/xmcloud3.0/status_lua/*

EXPOSE 8005 8105
WORKDIR /xm_workspace/xmcloud3.0/status_lua/
CMD ["supervisord"]
