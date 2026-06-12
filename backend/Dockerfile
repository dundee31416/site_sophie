FROM python:3.12-slim

WORKDIR /app

# Copy requirements first for better caching. Every runtime dependency ships
# a prebuilt wheel, so no gcc/build toolchain is needed in the image.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy and set up entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
