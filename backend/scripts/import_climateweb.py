"""Run from repository root with backend/.venv/Scripts/python.exe."""
import argparse,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parents[1]))
from app.climateweb_importer import read_source,stage_and_promote
parser=argparse.ArgumentParser()
parser.add_argument('--json');parser.add_argument('--companies');parser.add_argument('--relations')
parser.add_argument('--accept-synthetic-demo',action='store_true')
parser.add_argument('--output',default=str(Path(__file__).parents[1]/'data/normalized/climateweb'))
a=parser.parse_args()
source=read_source(json_path=a.json,companies_path=a.companies,relations_path=a.relations)
print(json.dumps(stage_and_promote(source,a.output,a.accept_synthetic_demo),indent=2))
