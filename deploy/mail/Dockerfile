FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY mock_server.py /app/
EXPOSE 8081
CMD ["python", "mock_server.py"]

