$base='http://localhost:5173'
$null=Invoke-WebRequest "$base/signin-with-chatgpt?return_to=/" -SessionVariable testSession
function SaveRecord($kind,$data,$id=''){ $body=@{kind=$kind;data=$data};if($id){$body.id=$id};(Invoke-RestMethod "$base/api/records" -WebSession $testSession -Method Post -ContentType 'application/json' -Body ($body|ConvertTo-Json -Depth 6)).record }
$created=[System.Collections.Generic.List[string]]::new()
try {
 $agent=SaveRecord 'agent' @{name='面談検証用エージェント';contact='';memo=''};$created.Add($agent.id)
 $meeting=SaveRecord 'event' @{companyId='';agentId=$agent.id;allDay=$false;title='エージェント面談';start='2027-01-01T01:00:00Z';end='2027-01-01T02:00:00Z';place='オンライン';memo=''};$created.Add($meeting.id)
 $block=SaveRecord 'event' @{companyId='';agentId='';allDay=$true;title='終日不可';start='2027-01-01T15:00:00Z';end='2027-01-02T15:00:00Z';place='';memo=''};$created.Add($block.id)
 $task=SaveRecord 'task' @{companyId='';agentId=$agent.id;title='SPI受験';dueDate='2027-01-03';dueTime='17:00';priority='高';done=$false;memo='期限確認'};$created.Add($task.id)
 $task.data.done=$true;$updated=SaveRecord 'task' $task.data $task.id
 $rows=(Invoke-RestMethod "$base/api/records" -WebSession $testSession).records
 if(-not ($rows|Where-Object id -eq $task.id).data.done){throw 'Task completion not persisted'}
 if(($rows|Where-Object id -eq $meeting.id).data.agentId -ne $agent.id){throw 'Agent relation lost'}
 if(-not ($rows|Where-Object id -eq $block.id).data.allDay){throw 'All-day flag lost'}
 $bad=Invoke-WebRequest "$base/api/records" -WebSession $testSession -Method Post -ContentType 'application/json' -Body (@{kind='task';data=@{title='bad';dueDate='2027-01-03';dueTime='';priority='高';memo='';agentId='nonexistent'}}|ConvertTo-Json) -SkipHttpErrorCheck
 if($bad.StatusCode -ne 400){throw 'Invalid relation accepted'}
 $protected=Invoke-WebRequest "$base/api/records" -WebSession $testSession -Method Delete -ContentType 'application/json' -Body (@{id=$agent.id}|ConvertTo-Json) -SkipHttpErrorCheck
 if($protected.StatusCode -ne 409){throw 'Agent relation deletion protection failed'}
 'Agent-only meeting, all-day event, task completion persistence, invalid relation and delete protection: passed.'
} finally { $created.Reverse();foreach($id in $created){$null=Invoke-RestMethod "$base/api/records" -WebSession $testSession -Method Delete -ContentType 'application/json' -Body (@{id=$id}|ConvertTo-Json)} }
foreach($q in @('ソニー','株式会社サイバーエージェント','桃太郎')){
 $r=Invoke-WebRequest ($base+'/api/overview?q='+[uri]::EscapeDataString($q)) -WebSession $testSession -SkipHttpErrorCheck
 $b=$r.Content|ConvertFrom-Json
 [pscustomobject]@{query=$q;status=$r.StatusCode;titles=($b.candidates.title -join ', ')}
 if($q -eq '桃太郎' -and $r.StatusCode -ne 404){throw 'Non-company query not rejected'}
 if($q -ne '桃太郎' -and $r.StatusCode -ne 200){throw 'Known company search failed'}
}
