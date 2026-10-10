"""Import an inspected CCKP file with explicit source-column/geography mapping."""
import argparse,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parents[1]))
from app.projections import import_projection_file

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--file',required=True);parser.add_argument('--mapping',required=True)
    args=parser.parse_args()
    result=import_projection_file(args.file,json.loads(Path(args.mapping).read_text(encoding='utf-8-sig')))
    print(json.dumps({'sourceHash':result['sha256'],'records':len(result['records'])}))

if __name__=='__main__':main()
