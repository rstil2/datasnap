from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.csv_file import CSVFile

# Create database engine
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # Create a database record for our sample CSV file
    sample_file = CSVFile(
        filename="sample_sales.csv",
        original_filename="sample_sales.csv", 
        file_path="uploads/sample_sales.csv",
        row_count=25,
        user_id=1
    )
    
    # Set the columns using the property setter
    sample_file.columns = [
        "Date", "Product", "Category", "Price", "Quantity", 
        "Customer_Age", "Customer_Rating", "Region"
    ]
    
    db.add(sample_file)
    db.commit()
    db.refresh(sample_file)
    
    print(f"Created CSV file record with ID: {sample_file.id}")
    print(f"Columns: {sample_file.columns}")
    
except Exception as e:
    print(f"Error creating file record: {e}")
    db.rollback()
finally:
    db.close()