# KuStudyhub

A Django web application for managing and organizing study materials, PDFs, and exam papers. This is a mirror copy of the Currently Deployed Branch at [KuStudyhub](https://www.kustudyhub.live)

## TODOS
 - Handle Files On B2
 - Refine the Sort Script (Docsort)
 - A more Whole Processing Pipeline
 - Tests
 - Name All Units
 - Dedupe files


## Features

- PDF upload and management
- Unit organization system
- PDF reader with dark mode
- Exam paper uploads
- Cloudinary integration for file storage
- Backblaze B2 storage support
- Bulk Sorting (Place files in /media/unsorted_folder) and run the sort_pdfs script

## Setup
### Installation

1. Clone the repository:
   ```bash
   git clone git@github.com:benar-m/KuStudyhub.git

   cd KuStudyhub
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Environment Configuration:
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Fill in your environment variables in `.env`
   
   Required environment variables:
   - `SECRET_KEY`: Django secret key
   - `DEBUG`: Set to `True` for development, `False` for prod
   - `DATABASE_URL`: Database connection string (optional, defaults to SQLite)
   - `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
   - `CLOUDINARY_API_KEY`: Your Cloudinary API key
   - `CLOUDINARY_API_SECRET`: Your Cloudinary API secret
   - `BACKBLAZE_APPLICATION_KEY_ID`: Backblaze B2 application key ID
   - `BACKBLAZE_APPLICATION_KEY`: Backblaze B2 application key
   - `BACKBLAZE_BUCKET_NAME`: Your B2 bucket name
   - `BACKBLAZE_BUCKET_FOLDER`: Upload folder path in B2

5. Run migrations:
   ```bash
   python manage.py migrate
   ```


6. Run the development server:
   ```bash
   python manage.py runserver
   ```

## Deployment

The application is configured for Heroku deployment with the included `Procfile`. Make sure to set all environment variables in your Heroku app settings.

## Project Structure

- `core/`: Main application with models, views, and templates
- `DocSort/`: PDF sorting and processing functionality
- `static/`: Static files (CSS, JavaScript, icons)
- `templates/`: HTML templates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
