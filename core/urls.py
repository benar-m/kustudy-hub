from django.urls import path
from core import views
urlpatterns=[
    path('api/units/',views.get_units,name='get_units'),
    path('api/unit/<int:unit_id>/pdfs/',views.get_pdfs_by_unit,name='get_pdfs_by_unit'),
    path('api/unit/<int:unit_id>/',views.fetch_unit_code,name='fetch_unit_code'),
    path('',views.render_home,name='home'),
    path('upload/',views.render_upload_pdf,name='upload_pdf'),
    path('units/',views.render_units,name='units'),
    path('api/upload_pdf/',views.single_upload_pdf,name='single_upload_pdf'),
    path('api/batchUpload/',views.multipleFileUploads,name='multipleFileUpload'),
    path('googlefd298c7641c3b2af.html',views.render_search_console_verifier,name='google_verification'),

    
    

]