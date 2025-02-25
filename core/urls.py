from django.urls import path
from core import views
urlpatterns=[
    path('api/units/',views.get_units,name='get_units'),
    path('api/unit/<int:unit_id>/pdfs/',views.get_pdfs_by_unit,name='get_pdfs_by_unit'),
    path('',views.render_home,name='home'),
    path('upload/',views.render_upload_pdf,name='upload_pdf')
    

]