2. Lecture Broadcasting Service — лекции
# Создать лекцию (самое важное — сначала создать)
 Из за особенности powerShell на windows 10 у меня не отображается корректно имя лекции даже если я прописываю «[Console]::OutputEncoding = [System.Text.Encoding]::UTF8» всё равно остается в виде «Ð¾Ñ Ð¿ÐµÑÐ²Ð°Ñ Ð»ÐµÐºÑ» и команда: 
curl.exe -X POST http://localhost:8080/lectures `
  -H "Content-Type: application/json" `
  -d '{"name": "L", "accessType": "PUBLIC"}'
так как в названии лекции есть пробелы  не будет выполняться поэтому для тестирования разберем запрос на две части первая часть создание переменной: 
$data = @{
name = "Моя первая лекция"
accessType = "PUBLIC"
     }
И её вторая часть выполнение запроса и повторное указать кодировки: 
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant>
>> Invoke-RestMethod -Method Post -Uri "http://localhost:8080/lectures" -ContentType "application/json; charset=utf-8" -Body $json
id           : 1
name         : ÐÐ¾Ñ Ð¿ÐµÑÐ²Ð°Ñ Ð»ÐµÐºÑÐ¸Ñ
status       : CREATED
currentSlide : 1
sequenceId   :
accessType   : OPEN
password     :
 
Где мы видем идентификатор лекции, её название, статус, и остальные параметры.
# Получить список лекций (ЭТО РАБОТАЕТ, вы уже проверили)
curl.exe http://localhost:8080/lectures
curl http://localhost:8080/lectures
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8080/lectures

StatusCode        : 200
StatusDescription : OK
Content           : [{"id":4,"name":"Ð¾Ñ Ð¿ÐµÑÐ²Ð°Ñ Ð»ÐµÐºÑ","status":"CREATED","currentSlide":1,"sequenceId":null,"accessType":"OPEN"},{"id":2,"name":"Ð¾Ñ Ð¿ÐµÑÐ²Ð°Ñ Ð»ÐµÐºÑÐ¸Ñ","status":"CREATED","currentSlide...
RawContent        : HTTP/1.1 200 OK
                    transfer-encoding: chunked
                    Vary: Origin,Access-Control-Request-Method,Access-Control-Request-Headers
                    Content-Type: application/json
                    Date: Wed, 22 Apr 2026 12:43:06 GMT
                    [{"id":4,...
Forms             : {}
Headers           : {[transfer-encoding, chunked], [Vary, Origin,Access-Control-Request-Method,Access-Control-Request-Headers], [Content-Type, application/json], [Date, Wed, 22 Apr 2026 12:43:06 GMT]}
Images            : {}
InputFields       : {}
Links             : {}
ParsedHtml        : mshtml.HTMLDocumentClass
RawContentLength  : 368

PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl.exe http://localhost:8080/lectures
[{"id":4,"name":"оя первая лекц","status":"CREATED","currentSlide":1,"sequenceId":null,"accessType":"OPEN"},{"id":2,"name":"оя первая лекция","status":"CREATED","currentSlide":1,"sequenceId":null,"accessType":"OPEN"},{"id":1,"name":"Моя первая лекция","status":"CREATED","currentSlide":1,"sequenceId":null,"accessType":"OPEN"}]
 
# Получить конкретную лекцию 
curl.exe http://localhost:8080/lectures/4
curl http://localhost:8080/lectures/4
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8080/lectures/4

StatusCode        : 200
StatusDescription : OK
Content           : {"id":4,"name":"Ð¾Ñ Ð¿ÐµÑÐ²Ð°Ñ Ð»ÐµÐºÑ","status":"CREATED","currentSlide":1,"sequenceId":null,"accessType":"OPEN","password":null}
RawContent        : HTTP/1.1 200 OK
                    transfer-encoding: chunked
                    Vary: Origin,Access-Control-Request-Method,Access-Control-Request-Headers
                    Content-Type: application/json
                    Date: Wed, 22 Apr 2026 12:47:57 GMT
                    {"id":4,"...
Forms             : {}
Headers           : {[transfer-encoding, chunked], [Vary, Origin,Access-Control-Request-Method,Access-Control-Request-Headers], [Content-Type, application/json], [Date, Wed, 22 Apr 2026 12:47:57 GMT]}
Images            : {}
InputFields       : {}
Links             : {}
ParsedHtml        : mshtml.HTMLDocumentClass
RawContentLength  : 134

PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl.exe http://localhost:8080/lectures/4
{"id":4,"name":"оя первая лекц","status":"CREATED","currentSlide":1,"sequenceId":null,"accessType":"OPEN","password":null}

 
# Запустить лекцию (изменить статус CREATED → ACTIVE)
curl.exe -X POST http://localhost:8080/lectures/1/start
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl.exe -X POST http://localhost:8080/lectures/1/start
{"id":1,"name":"Моя первая лекция","status":"ACTIVE","currentSlide":1,"sequenceId":null,"accessType":"OPEN","password":null}
 
# Остановить лекцию
curl.exe -X POST http://localhost:8080/lectures/1/stop
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl.exe -X POST http://localhost:8080/lectures/1/stop
{"id":1,"name":"Моя первая лекция","status":"STOPPED","currentSlide":1,"sequenceId":null,"accessType":"OPEN","password":null}
 



# Сменить текущий слайд (рассылает студентам)
Invoke-WebRequest -Method Put `
  -Uri "http://localhost:8080/lectures/5/current-slide" `
  -ContentType "application/json" `
  -Body (@{ slideNumber = 2 } | ConvertTo-Json) | Select-Object StatusCode, StatusDescription

PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> Invoke-WebRequest -Method Put `
>>   -Uri "http://localhost:8080/lectures/5/current-slide" `
>>   -ContentType "application/json" `
>>   -Body (@{ slideNumber = 2 } | ConvertTo-Json) | Select-Object StatusCode, StatusDescription

StatusCode StatusDescription
---------- -----------------
       200 OK
 
Upload презентации → получить sequenceId
$upload = curl.exe -sS -X POST "http://localhost:8080/presentations/upload" `
  -F "file=@C:\Users\Seren\Documents\Temp\этика.pdf" | ConvertFrom-Json
 
# Получить список студентов (по их chatId)
curl http://localhost:8080/lectures/1/students
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8080/lectures/1/students
 

StatusCode        : 200
StatusDescription : OK
Content           : []
RawContent        : HTTP/1.1 200 OK
                    transfer-encoding: chunked
                    Vary: Origin,Access-Control-Request-Method,Access-Control-Request-Headers
                    Content-Type: application/json
                    Date: Wed, 22 Apr 2026 18:27:01 GMT

                    []
Forms             : {}
Headers           : {[transfer-encoding, chunked], [Vary, Origin,Access-Control-Request-Method,Access-Control-Request-Headers], [Content-Type, application/json], [Date, Wed, 22 Apr 2026 18:27:01 GMT]}
Images            : {}
InputFields       : {}
Links             : {}
ParsedHtml        : mshtml.HTMLDocumentClass
RawContentLength  : 2

# Отправить сообщение всем студентам
Invoke-WebRequest -Method Post `
  -Uri "http://localhost:8080/lectures/1/broadcast-message" `
  -ContentType "application/json; charset=utf-8" `
  -Body (@{ text="Внимание, скоро тест!" } | ConvertTo-Json) | Select-Object StatusCode, StatusDescription
 
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> Invoke-WebRequest -Method Post `
>>   -Uri "http://localhost:8080/lectures/1/broadcast-message" `
>>   -ContentType "application/json; charset=utf-8" `
>>   -Body (@{ text="Внимание, скоро тест!" } | ConvertTo-Json) | Select-Object StatusCode, StatusDescription

StatusCode StatusDescription
---------- -----------------
       200 OK
# Получить вопросы от студентов
curl http://localhost:8080/lectures/1/student-questions
 
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8080/lectures/1/student-questions


StatusCode        : 200
StatusDescription : OK
Content           : []
RawContent        : HTTP/1.1 200 OK
                    transfer-encoding: chunked
                    Vary: Origin,Access-Control-Request-Method,Access-Control-Request-Headers
                    Content-Type: application/json
                    Date: Wed, 22 Apr 2026 18:37:56 GMT

                    []
Forms             : {}
Headers           : {[transfer-encoding, chunked], [Vary, Origin,Access-Control-Request-Method,Access-Control-Request-Headers], [Content-Type, application/json], [Date, Wed, 22 Apr 2026 18:37:56 GMT]}
Images            : {}
InputFields       : {}
Links             : {}
ParsedHtml        : mshtml.HTMLDocumentClass
RawContentLength  : 2

# Запустить тест в боте
curl.exe -X POST http://localhost:8080/api/exams/launch -H "Content-Type: application/json" -d '{"examId": "ваш-uuid-теста", "lectureId": 1}'

Создать тест (Exam) для lectureId=1
$body = @{
  lectureId = 1
  title = "E2E Exam"
  examType = "EXAM"
  totalTimeSec = 60
  questions = @(
    @{
      type = "MULTIPLE"
      text = "2+2=?"
      timeLimitSec = 30
      options = @(
        @{ text = "3"; correct = $false }
        @{ text = "4"; correct = $true }
      )
    }
  )
} | ConvertTo-Json -Depth 10
$exam = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/exams" -ContentType "application/json; charset=utf-8" -Body $body
$exam
Invoke-WebRequest -Method Post -Uri "http://localhost:8080/api/exams/launch" `
  -ContentType "application/json; charset=utf-8" `
  -Body (@{ examId = "$($exam.id)"; lectureId = "1" } | ConvertTo-Json) |
  Select-Object StatusCode, StatusDescription

PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl.exe http://localhost:8080/lectures/1/exams
[]
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> $body = @{
>>   lectureId = 1
>>   title = "E2E Exam"
>>   examType = "EXAM"
>>   totalTimeSec = 60
>>   questions = @(
>>     @{
>>       type = "MULTIPLE"
>>       text = "2+2=?"
>>       timeLimitSec = 30
>>       options = @(
>>         @{ text = "3"; correct = $false }
>>         @{ text = "4"; correct = $true }
>>       )
>>     }
>>   )
>> } | ConvertTo-Json -Depth 10
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant>
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> $exam = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/exams" -ContentType "application/json; charset=utf-8" -Body $body
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> $exam


id           : f912e23b-1955-4376-97f6-9edc0f059482
lectureId    : 1
title        : E2E Exam
totalTimeSec : 60
status       : DRAFT
examType     : EXAM
questions    : {@{id=c375e5be-0a06-4d82-bb05-2f94a32fee84; orderIndex=0; text=2+2=?; type=MULTIPLE; timeLimitSec=30; options=System.Object[]}}



PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl.exe -sS http://localhost:8080/lectures/1/exams
[{"id":"f912e23b-1955-4376-97f6-9edc0f059482","title":"E2E Exam","totalTimeSec":60,"status":"DRAFT","examType":"EXAM","questionCount":1}]
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> Invoke-WebRequest -Method Post -Uri "http://localhost:8080/api/exams/launch" `
>>   -ContentType "application/json; charset=utf-8" `
>>   -Body (@{ examId = "$($exam.id)"; lectureId = "1" } | ConvertTo-Json) |
>>   Select-Object StatusCode, StatusDescription

StatusCode StatusDescription
---------- -----------------
       200 OK
•	Gateway → Quiz Service: успешно создали экзамен через POST /exams и увидели его через GET /lectures/1/exams.
•	Gateway → Lecture Broadcasting → Quiz Service: POST /api/exams/launch вернул 200 OK, значит lecture-broadcasting-service смог:
•	распарсить examId и lectureId,
•	сходить в quiz-service за экзаменом (getExam),
•	перевести его в ACTIVE (launchExam).
 
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl.exe -sS "http://localhost:8080/exams/$($exam.id)" | ConvertFrom-Json | Select-Object id,status,title,lectureId

id                                   status title    lectureId
--                                   ------ -----    ---------
f912e23b-1955-4376-97f6-9edc0f059482 CLOSED E2E Exam         1

PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> docker logs lecture_broadcasting_service --tail 50
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:205) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:149) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.tomcat.websocket.server.WsFilter.doFilter(WsFilter.java:51) ~[tomcat-embed-websocket-10.1.19.jar!/:na]
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:174) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:149) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.springframework.web.filter.RequestContextFilter.doFilterInternal(RequestContextFilter.java:100) ~[spring-web-6.1.4.jar!/:6.1.4]
        at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:116) ~[spring-web-6.1.4.jar!/:6.1.4]
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:174) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:149) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.springframework.web.filter.FormContentFilter.doFilterInternal(FormContentFilter.java:93) ~[spring-web-6.1.4.jar!/:6.1.4]
        at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:116) ~[spring-web-6.1.4.jar!/:6.1.4]
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:174) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:149) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.springframework.web.filter.CharacterEncodingFilter.doFilterInternal(CharacterEncodingFilter.java:201) ~[spring-web-6.1.4.jar!/:6.1.4]
        at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:116) ~[spring-web-6.1.4.jar!/:6.1.4]
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:174) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:149) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:167) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:90) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.catalina.authenticator.AuthenticatorBase.invoke(AuthenticatorBase.java:482) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:115) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:93) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:74) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:344) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.coyote.http11.Http11Processor.service(Http11Processor.java:391) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:63) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:896) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1744) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:52) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1191) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:659) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at org.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run(TaskThread.java:63) ~[tomcat-embed-core-10.1.19.jar!/:na]
        at java.base/java.lang.Thread.run(Unknown Source) ~[na:na]

2026-04-22T18:03:24.288Z  INFO 1 --- [lecture-broadcasting-service] [MessageBroker-1] o.s.w.s.c.WebSocketMessageBrokerStats    : WebSocketSession[0 current WS(0)-HttpStream(0)-HttpPoll(0), 0 total, 0 closed abnormally (0 connect failure, 0 send limit, 0 transport error)], stompSubProtocol[processed CONNECT(0)-CONNECTED(0)-DISCONNECT(0)], stompBrokerRelay[null], inboundChannel[pool size = 0, active threads = 0, queued tasks = 0, completed tasks = 0], outboundChannel[pool size = 0, active threads = 0, queued tasks = 0, completed tasks = 0], sockJsScheduler[pool size = 4, active threads = 1, queued tasks = 0, completed tasks = 24]
2026-04-22T18:05:10.950Z  WARN 1 --- [lecture-broadcasting-service] [nio-8082-exec-5] .w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.http.converter.HttpMessageNotReadableException: JSON parse error: Unexpected character ('n' (code 110)): was expecting double-quote to start field name]
2026-04-22T18:05:17.200Z  WARN 1 --- [lecture-broadcasting-service] [nio-8082-exec-7] .w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.web.HttpRequestMethodNotSupportedException: Request method 'POST' is not supported]
2026-04-22T18:05:43.602Z  WARN 1 --- [lecture-broadcasting-service] [nio-8082-exec-6] .w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.web.method.annotation.MethodArgumentTypeMismatchException: Failed to convert value of type 'java.lang.String' to required type 'java.lang.Long'; For input string: "current-slide"]
2026-04-22T18:10:43.672Z  WARN 1 --- [lecture-broadcasting-service] [nio-8082-exec-8] .w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.http.converter.HttpMessageNotReadableException: JSON parse error: Unexpected character ('s' (code 115)): was expecting double-quote to start field name]
2026-04-22T18:10:53.386Z  WARN 1 --- [lecture-broadcasting-service] [nio-8082-exec-1] .w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.web.HttpRequestMethodNotSupportedException: Request method 'POST' is not supported]
2026-04-22T18:11:22.420Z  WARN 1 --- [lecture-broadcasting-service] [nio-8082-exec-2] .w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.web.method.annotation.MethodArgumentTypeMismatchException: Failed to convert value of type 'java.lang.String' to required type 'java.lang.Long'; For input string: "current-slide"]
2026-04-22T18:29:54.615Z  WARN 1 --- [lecture-broadcasting-service] [nio-8082-exec-5] .w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.http.converter.HttpMessageNotReadableException: JSON parse error: Unexpected character ('m' (code 109)): was expecting double-quote to start field name]
2026-04-22T18:30:43.617Z  WARN 1 --- [lecture-broadcasting-service] [nio-8082-exec-7] .w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.http.converter.HttpMessageNotReadableException: JSON parse error: Unexpected character ('t' (code 116)): was expecting double-quote to start field name]
2026-04-22T18:31:33.557Z  WARN 1 --- [lecture-broadcasting-service] [nio-8082-exec-6] .w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.http.converter.HttpMessageNotReadableException: JSON parse error: Unexpected character ('t' (code 116)): was expecting double-quote to start field name]
2026-04-22T18:33:24.176Z  INFO 1 --- [lecture-broadcasting-service] [MessageBroker-1] o.s.w.s.c.WebSocketMessageBrokerStats    : WebSocketSession[0 current WS(0)-HttpStream(0)-HttpPoll(0), 0 total, 0 closed abnormally (0 connect failure, 0 send limit, 0 transport error)], stompSubProtocol[processed CONNECT(0)-CONNECTED(0)-DISCONNECT(0)], stompBrokerRelay[null], inboundChannel[pool size = 0, active threads = 0, queued tasks = 0, completed tasks = 0], outboundChannel[pool size = 0, active threads = 0, queued tasks = 0, completed tasks = 0], sockJsScheduler[pool size = 4, active threads = 1, queued tasks = 0, completed tasks = 25]
2026-04-22T18:34:26.683Z  WARN 1 --- [lecture-broadcasting-service] [nio-8082-exec-8] .w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.http.converter.HttpMessageNotReadableException: JSON parse error: Unexpected character ('t' (code 116)): was expecting double-quote to start field name]
2026-04-22T18:34:30.973Z  WARN 1 --- [lecture-broadcasting-service] [nio-8082-exec-1] .w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.http.converter.HttpMessageNotReadableException: JSON parse error: Unexpected character ('\' (code 92)): was expecting double-quote to start field name]
2026-04-22T18:39:16.284Z  WARN 1 --- [lecture-broadcasting-service] [nio-8082-exec-9] .w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.http.converter.HttpMessageNotReadableException: JSON parse error: Unexpected character ('e' (code 101)): was expecting double-quote to start field name]
2026-04-22T18:45:46.786Z  INFO 1 --- [lecture-broadcasting-service] [io-8082-exec-10] r.u.l.controller.ExamLaunchController    : Launching exam f912e23b-1955-4376-97f6-9edc0f059482 for lecture 1 → 0 students
2026-04-22T18:46:46.783Z  INFO 1 --- [lecture-broadcasting-service] [        Timer-0] r.u.l.controller.ExamLaunchController    : Auto-closing exam f912e23b-1955-4376-97f6-9edc0f059482 after 60 sec
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant>

экзамен сразу стал CLOSED, а не ACTIVE
Был создан экзамен с totalTimeSec = 60. Когда вы вызываете POST /api/exams/launch, код в lecture-broadcasting-service делает две вещи:
•	переводит экзамен в ACTIVE в quiz-service
•	ставит таймер, который через totalTimeSec секунд автоматически вызовет закрытие экзамена
Это прямо видно в логах:
•	18:45:46 Launching exam ...
•	18:46:46 Auto-closing exam ... after 60 sec
То есть к моменту, когда вы сделали GET /exams/{id}, с высокой вероятностью уже прошла минута — и экзамен стал CLOSED. Это не ошибка.
