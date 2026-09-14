$base='http://localhost:5173'
$null=Invoke-WebRequest "$base/signin-with-chatgpt?return_to=/" -SessionVariable testSession
function SaveRecord($kind,$data,$id='') { $body=@{kind=$kind;data=$data}; if($id){$body.id=$id}; (Invoke-RestMethod "$base/api/records" -WebSession $testSession -Method Post -ContentType 'application/json' -Body ($body|ConvertTo-Json -Depth 6)).record }
$agent=SaveRecord 'agent' @{name='検証用エージェント';contact='テスト';memo=''}
$company=SaveRecord 'company' @{name='検証用企業';industry='IT';status='一次面接';priority='高';agentId=$agent.id;overview='概要';url='';source=''}
$note=SaveRecord 'note' @{companyId=$company.id;date='2026-09-14';title='説明会';content='仕事内容';feeling='雰囲気が良い';rating='4'}
$event=SaveRecord 'event' @{companyId=$company.id;title='面接';start='2026-09-15T01:00:00Z';end='2026-09-15T02:00:00Z';place='オンライン';memo=''}
$all=(Invoke-RestMethod "$base/api/records" -WebSession $testSession).records
if(@($all|Where-Object id -eq $note.id).Count -ne 1){throw 'Persistence failure'}
$company.data.status='最終面接'
$updated=SaveRecord 'company' $company.data $company.id
if($updated.data.status -ne '最終面接'){throw 'Update failed'}
$blocked=Invoke-WebRequest "$base/api/records" -WebSession $testSession -Method Delete -ContentType 'application/json' -Body (@{id=$company.id}|ConvertTo-Json) -SkipHttpErrorCheck
if($blocked.StatusCode -ne 409){throw 'Relation protection failed'}
$anon=Invoke-WebRequest "$base/api/records" -SkipHttpErrorCheck
if($anon.StatusCode -ne 401){throw 'Auth failure'}
foreach($recordId in @($note.id,$event.id,$company.id,$agent.id)){ $null=Invoke-RestMethod "$base/api/records" -WebSession $testSession -Method Delete -ContentType 'application/json' -Body (@{id=$recordId}|ConvertTo-Json) }
'CRUD, linked records, persistence, update, relation protection, anonymous rejection: passed.'
