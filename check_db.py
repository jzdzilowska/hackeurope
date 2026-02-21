from dotenv import load_dotenv
load_dotenv('.env')
from insights_engine.config import SUPABASE_URL, SUPABASE_KEY
from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)
r = sb.table('ai_insights').select('type,user_id,created_at,data').order('created_at', desc=True).limit(10).execute()
for row in r.data:
    score = row['data'].get('health_score') or row['data'].get('priority_score')
    print(row.get('type','')[:30], '|', str(row.get('user_id',''))[:8], '|', str(row.get('created_at',''))[:19], '| score:', score)
