from dotenv import load_dotenv
load_dotenv('.env')
from insights_engine.config import SUPABASE_URL, SUPABASE_KEY
from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)
r = sb.table('ai_insights').select('type,data').eq('user_id','c5cbf7bd-2801-407e-9efe-222d8e93fddc').execute()
for row in r.data:
    d = row['data']
    if row['type'] == 'financial_health_report':
        print('=== HEALTH ===')
        print('score:', d.get('health_score'))
        print('net_worth:', d.get('net_worth'))
        print('avg_burn:', d.get('avg_monthly_burn'))
        print('profit_margin_pct:', d.get('profit_margin_pct'))
        print('predicted_burn:', d.get('predicted_burn_next_month'))
        print('predicted_income:', d.get('predicted_income_next_month'))
        print('forecast_confidence:', d.get('forecast_confidence'))
        eb = d.get('executive_briefing', {})
        print('--- executive_briefing ---')
        for k,v in eb.items():
            print(f'  {k}: {v}')
        print('--- score_breakdown ---')
        for k,v in d.get('score_breakdown',{}).items():
            print(f'  {k}: {v.get("score")} | {v.get("reasoning","")}')
        print('--- top_3 ---')
        for i,x in enumerate(d.get('top_3_controllable_improvements',[])):
            print(f'  {i+1}: {x}')
        print('--- seasonal_risk:', d.get('seasonal_risk'))
        print('--- inventory_alert:', d.get('inventory_alert'))
        print('--- investment_opportunity:', d.get('investment_opportunity'))
        print('--- forecast_reasoning:', d.get('forecast_reasoning'))
        print('--- benchmark_summary:', d.get('benchmark_comparison',{}).get('summary',''))
        print('--- payroll_assessment:', d.get('payroll_assessment',''))
        print('--- cost_breakdown:', d.get('cost_breakdown'))
    else:
        print('=== SUBS ===')
        print('priority_score:', d.get('priority_score'))
        print('summary:', d.get('summary'))
        print('monthly_savings:', d.get('total_estimated_monthly_savings'))
        for ins in d.get('insights',[]):
            print(f'  [{ins.get("severity")}] {ins.get("title")} | {ins.get("headline_metric")}')
            print(f'    {ins.get("description","")[:120]}')
        rw = d.get('raw',{}).get('runway_stress_test',{})
        print('runway_stress:', rw)
