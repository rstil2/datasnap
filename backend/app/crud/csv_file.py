from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.csv_file import CSVFile
from app.schemas.csv_file import CSVFileCreate, CSVFileUpdate

def get(db: Session, id: int) -> Optional[CSVFile]:
    return db.query(CSVFile).filter(CSVFile.id == id).first()

def get_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[CSVFile]:
    return db.query(CSVFile)\
        .filter(CSVFile.user_id == user_id)\
        .order_by(CSVFile.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()

def create(db: Session, *, obj_in: CSVFileCreate, user_id: int, file_path: str) -> CSVFile:
    db_obj = CSVFile(
        filename=obj_in.filename,
        original_filename=obj_in.original_filename,
        file_path=file_path,
        row_count=obj_in.row_count,
        user_id=user_id
    )
    # Use the property setter which handles JSON conversion
    db_obj.columns = obj_in.columns
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update(db: Session, *, db_obj: CSVFile, obj_in: CSVFileUpdate) -> CSVFile:
    update_data = obj_in.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        # The columns property setter handles JSON conversion automatically
        setattr(db_obj, field, value)
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def remove(db: Session, *, id: int) -> CSVFile:
    obj = db.query(CSVFile).get(id)
    db.delete(obj)
    db.commit()
    return obj