FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY mock_server.py imap_ingest.py /app/
RUN mkdir -p /data && chmod 777 /data
EXPOSE 8081
VOLUME ["/data"]
CMD ["python", "mock_server.py"]
