import tempfile
from pathlib import Path
import pytest
from app.importer import stage_companies

def test_byte_integrity_id_namespace_and_dedup(tmp_path):
    source=tmp_path/'companies.csv';raw=b'id,name,untouched\r\n001,"A, Inc",\r\n002,B,value\r\n';source.write_bytes(raw)
    one=stage_companies(source,tmp_path/'raw','id','name');two=stage_companies(source,tmp_path/'raw','id','name')
    assert source.read_bytes()==raw==Path(one['report']['rawPath']).read_bytes()
    assert one['companies'][0]['id']=='sectivia:001'
    assert one['companies'][0]['ticker'] is None
    assert one['datasetVersion']==two['datasetVersion']
    assert len(list((tmp_path/'raw').iterdir()))==1
    assert one['report']['unmappedFields']==['untouched']

def test_failed_import_does_not_publish(tmp_path):
    source=tmp_path/'bad.csv';source.write_text('id,name\n1,A\n1,B\n')
    with pytest.raises(ValueError):stage_companies(source,tmp_path/'raw','id','name')
    assert not (tmp_path/'raw').exists()
