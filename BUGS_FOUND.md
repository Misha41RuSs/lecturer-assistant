# Найденные баги (QA3)

## BUG-1: Content Service не запускается
**Серьезность:** CRITICAL  
**Влияние:** Невозможно загружать презентации и получать слайды

**Шаги воспроизведения:**
1. `docker-compose up -d`
2. `curl http://localhost:8081/presentations`

**Ожидаемый результат:** HTTP 200 или 404  
**Фактический результат:** Нет ответа (контейнер не слушает порт)

**Логи:** 
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> docker logs content_service --tail 100

  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v3.2.5)

2026-04-22T06:02:01.620Z  INFO 1 --- [           main] r.u.c.ContentServiceApplication          : Starting ContentServiceApplication v1.0-SNAPSHOT using Java 21.0.10 with PID 1 (/app/app.jar started by root in /app)
2026-04-22T06:02:01.657Z  INFO 1 --- [           main] r.u.c.ContentServiceApplication          : No active profile set, falling back to 1 default profile: "default"
2026-04-22T06:02:07.864Z  INFO 1 --- [           main] .s.d.r.c.RepositoryConfigurationDelegate : Bootstrapping Spring Data JPA repositories in DEFAULT mode.
2026-04-22T06:02:08.384Z  INFO 1 --- [           main] .s.d.r.c.RepositoryConfigurationDelegate : Finished Spring Data repository scanning in 450 ms. Found 2 JPA repository interfaces.
2026-04-22T06:02:12.213Z  INFO 1 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat initialized with port 8081 (http)
2026-04-22T06:02:12.293Z  INFO 1 --- [           main] o.apache.catalina.core.StandardService   : Starting service [Tomcat]
2026-04-22T06:02:12.298Z  INFO 1 --- [           main] o.apache.catalina.core.StandardEngine    : Starting Servlet engine: [Apache Tomcat/10.1.20]
2026-04-22T06:02:12.537Z  INFO 1 --- [           main] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring embedded WebApplicationContext
2026-04-22T06:02:12.540Z  INFO 1 --- [           main] w.s.c.ServletWebServerApplicationContext : Root WebApplicationContext: initialization completed in 10180 ms
2026-04-22T06:02:13.969Z  INFO 1 --- [           main] o.hibernate.jpa.internal.util.LogHelper  : HHH000204: Processing PersistenceUnitInfo [name: default]
2026-04-22T06:02:14.717Z  INFO 1 --- [           main] org.hibernate.Version                    : HHH000412: Hibernate ORM core version 6.4.4.Final
2026-04-22T06:02:14.984Z  INFO 1 --- [           main] o.h.c.internal.RegionFactoryInitiator    : HHH000026: Second-level cache disabled
2026-04-22T06:02:17.087Z  INFO 1 --- [           main] o.s.o.j.p.SpringPersistenceUnitInfo      : No LoadTimeWeaver setup: ignoring JPA class transformer
2026-04-22T06:02:17.241Z  INFO 1 --- [           main] com.zaxxer.hikari.HikariDataSource       : HikariPool-1 - Starting...
2026-04-22T06:02:18.809Z  INFO 1 --- [           main] com.zaxxer.hikari.pool.HikariPool        : HikariPool-1 - Added connection org.postgresql.jdbc.PgConnection@166b11e
2026-04-22T06:02:18.822Z  INFO 1 --- [           main] com.zaxxer.hikari.HikariDataSource       : HikariPool-1 - Start completed.
2026-04-22T06:02:23.378Z  INFO 1 --- [           main] o.h.e.t.j.p.i.JtaPlatformInitiator       : HHH000489: No JTA platform available (set 'hibernate.transaction.jta.platform' to enable JTA platform integration)
2026-04-22T06:02:23.643Z  INFO 1 --- [           main] j.LocalContainerEntityManagerFactoryBean : Initialized JPA EntityManagerFactory for persistence unit 'default'
2026-04-22T06:02:25.218Z  WARN 1 --- [           main] JpaBaseConfiguration$JpaWebConfiguration : spring.jpa.open-in-view is enabled by default. Therefore, database queries may be performed during view rendering. Explicitly configure spring.jpa.open-in-view to disable this warning
2026-04-22T06:02:27.162Z  INFO 1 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port 8081 (http) with context path ''
2026-04-22T06:02:27.241Z  INFO 1 --- [           main] r.u.c.ContentServiceApplication          : Started ContentServiceApplication in 28.709 seconds (process running for 32.775)
2026-04-22T06:02:39.796Z  INFO 1 --- [nio-8081-exec-1] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring DispatcherServlet 'dispatcherServlet'
2026-04-22T06:02:39.796Z  INFO 1 --- [nio-8081-exec-1] o.s.web.servlet.DispatcherServlet        : Initializing Servlet 'dispatcherServlet'
2026-04-22T06:02:39.799Z  INFO 1 --- [nio-8081-exec-1] o.s.web.servlet.DispatcherServlet        : Completed initialization in 2 ms
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> docker logs content_service --tail 500

  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v3.2.5)

2026-04-22T06:02:01.620Z  INFO 1 --- [           main] r.u.c.ContentServiceApplication          : Starting ContentServiceApplication v1.0-SNAPSHOT using Java 21.0.10 with PID 1 (/app/app.jar started by root in /app)
2026-04-22T06:02:01.657Z  INFO 1 --- [           main] r.u.c.ContentServiceApplication          : No active profile set, falling back to 1 default profile: "default"
2026-04-22T06:02:07.864Z  INFO 1 --- [           main] .s.d.r.c.RepositoryConfigurationDelegate : Bootstrapping Spring Data JPA repositories in DEFAULT mode.
2026-04-22T06:02:08.384Z  INFO 1 --- [           main] .s.d.r.c.RepositoryConfigurationDelegate : Finished Spring Data repository scanning in 450 ms. Found 2 JPA repository interfaces.
2026-04-22T06:02:12.213Z  INFO 1 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat initialized with port 8081 (http)
2026-04-22T06:02:12.293Z  INFO 1 --- [           main] o.apache.catalina.core.StandardService   : Starting service [Tomcat]
2026-04-22T06:02:12.298Z  INFO 1 --- [           main] o.apache.catalina.core.StandardEngine    : Starting Servlet engine: [Apache Tomcat/10.1.20]
2026-04-22T06:02:12.537Z  INFO 1 --- [           main] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring embedded WebApplicationContext
2026-04-22T06:02:12.540Z  INFO 1 --- [           main] w.s.c.ServletWebServerApplicationContext : Root WebApplicationContext: initialization completed in 10180 ms
2026-04-22T06:02:13.969Z  INFO 1 --- [           main] o.hibernate.jpa.internal.util.LogHelper  : HHH000204: Processing PersistenceUnitInfo [name: default]
2026-04-22T06:02:14.717Z  INFO 1 --- [           main] org.hibernate.Version                    : HHH000412: Hibernate ORM core version 6.4.4.Final
2026-04-22T06:02:14.984Z  INFO 1 --- [           main] o.h.c.internal.RegionFactoryInitiator    : HHH000026: Second-level cache disabled
2026-04-22T06:02:17.087Z  INFO 1 --- [           main] o.s.o.j.p.SpringPersistenceUnitInfo      : No LoadTimeWeaver setup: ignoring JPA class transformer
2026-04-22T06:02:17.241Z  INFO 1 --- [           main] com.zaxxer.hikari.HikariDataSource       : HikariPool-1 - Starting...
2026-04-22T06:02:18.809Z  INFO 1 --- [           main] com.zaxxer.hikari.pool.HikariPool        : HikariPool-1 - Added connection org.postgresql.jdbc.PgConnection@166b11e
2026-04-22T06:02:18.822Z  INFO 1 --- [           main] com.zaxxer.hikari.HikariDataSource       : HikariPool-1 - Start completed.
2026-04-22T06:02:23.378Z  INFO 1 --- [           main] o.h.e.t.j.p.i.JtaPlatformInitiator       : HHH000489: No JTA platform available (set 'hibernate.transaction.jta.platform' to enable JTA platform integration)
2026-04-22T06:02:23.643Z  INFO 1 --- [           main] j.LocalContainerEntityManagerFactoryBean : Initialized JPA EntityManagerFactory for persistence unit 'default'
2026-04-22T06:02:25.218Z  WARN 1 --- [           main] JpaBaseConfiguration$JpaWebConfiguration : spring.jpa.open-in-view is enabled by default. Therefore, database queries may be performed during view rendering. Explicitly configure spring.jpa.open-in-view to disable this warning
2026-04-22T06:02:27.162Z  INFO 1 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port 8081 (http) with context path ''
2026-04-22T06:02:27.241Z  INFO 1 --- [           main] r.u.c.ContentServiceApplication          : Started ContentServiceApplication in 28.709 seconds (process running for 32.775)
2026-04-22T06:02:39.796Z  INFO 1 --- [nio-8081-exec-1] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring DispatcherServlet 'dispatcherServlet'
2026-04-22T06:02:39.796Z  INFO 1 --- [nio-8081-exec-1] o.s.web.servlet.DispatcherServlet        : Initializing Servlet 'dispatcherServlet'
2026-04-22T06:02:39.799Z  INFO 1 --- [nio-8081-exec-1] o.s.web.servlet.DispatcherServlet        : Completed initialization in 2 ms
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> docker logs quiz_service --tail 500

  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v3.2.3)

2026-04-22T06:02:01.808Z  INFO 1 --- [quiz-service] [           main] r.u.quizservice.QuizServiceApplication   : Starting QuizServiceApplication v0.0.1-SNAPSHOT using Java 21.0.10 with PID 1 (/app/app.jar started by root in /app)
2026-04-22T06:02:01.823Z  INFO 1 --- [quiz-service] [           main] r.u.quizservice.QuizServiceApplication   : No active profile set, falling back to 1 default profile: "default"
2026-04-22T06:02:09.135Z  INFO 1 --- [quiz-service] [           main] .s.d.r.c.RepositoryConfigurationDelegate : Bootstrapping Spring Data JPA repositories in DEFAULT mode.
2026-04-22T06:02:09.636Z  INFO 1 --- [quiz-service] [           main] .s.d.r.c.RepositoryConfigurationDelegate : Finished Spring Data repository scanning in 420 ms. Found 7 JPA repository interfaces.
2026-04-22T06:02:13.352Z  INFO 1 --- [quiz-service] [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat initialized with port 8083 (http)
2026-04-22T06:02:13.411Z  INFO 1 --- [quiz-service] [           main] o.apache.catalina.core.StandardService   : Starting service [Tomcat]
2026-04-22T06:02:13.412Z  INFO 1 --- [quiz-service] [           main] o.apache.catalina.core.StandardEngine    : Starting Servlet engine: [Apache Tomcat/10.1.19]
2026-04-22T06:02:13.552Z  INFO 1 --- [quiz-service] [           main] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring embedded WebApplicationContext
2026-04-22T06:02:13.555Z  INFO 1 --- [quiz-service] [           main] w.s.c.ServletWebServerApplicationContext : Root WebApplicationContext: initialization completed in 11159 ms
2026-04-22T06:02:14.774Z  INFO 1 --- [quiz-service] [           main] o.hibernate.jpa.internal.util.LogHelper  : HHH000204: Processing PersistenceUnitInfo [name: default]
2026-04-22T06:02:15.439Z  INFO 1 --- [quiz-service] [           main] org.hibernate.Version                    : HHH000412: Hibernate ORM core version 6.4.4.Final
2026-04-22T06:02:15.795Z  INFO 1 --- [quiz-service] [           main] o.h.c.internal.RegionFactoryInitiator    : HHH000026: Second-level cache disabled
2026-04-22T06:02:17.851Z  INFO 1 --- [quiz-service] [           main] o.s.o.j.p.SpringPersistenceUnitInfo      : No LoadTimeWeaver setup: ignoring JPA class transformer
2026-04-22T06:02:17.990Z  INFO 1 --- [quiz-service] [           main] com.zaxxer.hikari.HikariDataSource       : HikariPool-1 - Starting...
2026-04-22T06:02:19.199Z  INFO 1 --- [quiz-service] [           main] com.zaxxer.hikari.pool.HikariPool        : HikariPool-1 - Added connection org.postgresql.jdbc.PgConnection@3e74fd84
2026-04-22T06:02:19.203Z  INFO 1 --- [quiz-service] [           main] com.zaxxer.hikari.HikariDataSource       : HikariPool-1 - Start completed.
2026-04-22T06:02:19.583Z  WARN 1 --- [quiz-service] [           main] org.hibernate.orm.deprecation            : HHH90000025: PostgreSQLDialect does not need to be specified explicitly using 'hibernate.dialect' (remove the property setting and it will be selected by default)
2026-04-22T06:02:25.269Z  INFO 1 --- [quiz-service] [           main] o.h.e.t.j.p.i.JtaPlatformInitiator       : HHH000489: No JTA platform available (set 'hibernate.transaction.jta.platform' to enable JTA platform integration)
2026-04-22T06:02:25.715Z  INFO 1 --- [quiz-service] [           main] j.LocalContainerEntityManagerFactoryBean : Initialized JPA EntityManagerFactory for persistence unit 'default'
2026-04-22T06:02:28.702Z  WARN 1 --- [quiz-service] [           main] JpaBaseConfiguration$JpaWebConfiguration : spring.jpa.open-in-view is enabled by default. Therefore, database queries may be performed during view rendering. Explicitly configure spring.jpa.open-in-view to disable this warning
2026-04-22T06:02:29.828Z  INFO 1 --- [quiz-service] [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port 8083 (http) with context path ''
2026-04-22T06:02:29.855Z  INFO 1 --- [quiz-service] [           main] r.u.quizservice.QuizServiceApplication   : Started QuizServiceApplication in 31.591 seconds (process running for 35.241)
2026-04-22T06:05:43.332Z  INFO 1 --- [quiz-service] [nio-8083-exec-1] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring DispatcherServlet 'dispatcherServlet'
2026-04-22T06:05:43.333Z  INFO 1 --- [quiz-service] [nio-8083-exec-1] o.s.web.servlet.DispatcherServlet        : Initializing Servlet 'dispatcherServlet'
2026-04-22T06:05:43.335Z  INFO 1 --- [quiz-service] [nio-8083-exec-1] o.s.web.servlet.DispatcherServlet        : Completed initialization in 2 ms
2026-04-22T06:05:43.358Z  WARN 1 --- [quiz-service] [nio-8083-exec-1] .w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.web.HttpRequestMethodNotSupportedException: Request method 'GET' is not supported]
2026-04-22T06:10:04.833Z  WARN 1 --- [quiz-service] [nio-8083-exec-4] .w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.web.HttpRequestMethodNotSupportedException: Request method 'GET' is not supported]
2026-04-22T06:12:43.930Z  WARN 1 --- [quiz-service] [nio-8083-exec-7] .w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.web.HttpRequestMethodNotSupportedException: Request method 'GET' is not supported]
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> docker-compose restart content_service
time="2026-04-22T09:21:31+03:00" level=warning msg="The \"TELEGRAM_BOT_TOKEN\" variable is not set. Defaulting to a blank string."
time="2026-04-22T09:21:31+03:00" level=warning msg="The \"TELEGRAM_BOT_USERNAME\" variable is not set. Defaulting to a blank string."
no such service: content_service
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> docker-compose restart quiz_service
time="2026-04-22T09:22:18+03:00" level=warning msg="The \"TELEGRAM_BOT_TOKEN\" variable is not set. Defaulting to a blank string."
time="2026-04-22T09:22:18+03:00" level=warning msg="The \"TELEGRAM_BOT_USERNAME\" variable is not set. Defaulting to a blank string."
no such service: quiz_service
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> docker ps
CONTAINER ID   IMAGE                                           COMMAND                  CREATED          STATUS          PORTS                                         NAMES
f37207b0b5a2   digital-lecturer-admin-gateway                  "java -jar app.jar"      22 minutes ago   Up 22 minutes   0.0.0.0:8080->8080/tcp, [::]:8080->8080/tcp   admin_gateway
226bb3b8f7b6   digital-lecturer-lecture-broadcasting-service   "java -jar app.jar"      22 minutes ago   Up 22 minutes   0.0.0.0:8082->8082/tcp, [::]:8082->8082/tcp   lecture_broadcasting_service
f84ab7d46db6   digital-lecturer-analytics-service              "java -jar app.jar"      22 minutes ago   Up 22 minutes   0.0.0.0:8084->8084/tcp, [::]:8084->8084/tcp   analytics_service
c5d08a128f19   digital-lecturer-content-service                "java -jar app.jar"      22 minutes ago   Up 22 minutes   0.0.0.0:8081->8081/tcp, [::]:8081->8081/tcp   content_service
281163ee8d4e   digital-lecturer-quiz-service                   "java -jar app.jar"      22 minutes ago   Up 22 minutes   0.0.0.0:8083->8083/tcp, [::]:8083->8083/tcp   quiz_service
2e60d51e0fee   postgres:15-alpine                              "docker-entrypoint.s…"   22 minutes ago   Up 22 minutes   0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp   postgres_db
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant>
## BUG-2: Quiz Service не запускается
**Серьезность:** CRITICAL  
**Влияние:** Невозможно создавать тесты и проверять ответы

**Шаги воспроизведения:**
1. `docker-compose up -d`
2. `curl http://localhost:8083/exams`

**Ожидаемый результат:** HTTP 200  
**Фактический результат:** Нет ответа

## BUG-3: Gateway маршрутизирует запросы к мертвым сервисам
**Серьезность:** HIGH  
**Влияние:** Клиенты получают таймауты вместо понятных ошибок

**Рекомендация:** Добавить Health Check в Gateway и возвращать 503 если сервис недоступен

доп логи

PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8080/lectures


StatusCode        : 200
StatusDescription : OK
Content           : []
RawContent        : HTTP/1.1 200 OK
                    transfer-encoding: chunked
                    Vary: Origin,Access-Control-Request-Method,Access-Control-Request-Headers
                    Content-Type: application/json
                    Date: Wed, 22 Apr 2026 06:02:32 GMT

                    []
Forms             : {}
Headers           : {[transfer-encoding, chunked], [Vary, Origin,Access-Control-Request-Method,Access-Control-Request-Headers], [Content-Type, application/json], [Date, Wed, 22 Apr 2026 06:02:32 GMT]}
Images            : {}
InputFields       : {}
Links             : {}
ParsedHtml        : mshtml.HTMLDocumentClass
RawContentLength  : 2



PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8081/presentations
curl : Удаленный сервер возвратил ошибку: (404) Не найден.
строка:1 знак:1
+ curl http://localhost:8081/presentations
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (System.Net.HttpWebRequest:HttpWebRequest) [Invoke-WebRequest], WebException
    + FullyQualifiedErrorId : WebCmdletWebResponseException,Microsoft.PowerShell.Commands.InvokeWebRequestCommand

PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8083/exams
curl : Удаленный сервер возвратил ошибку: (405) Недопустимый метод.
строка:1 знак:1
+ curl http://localhost:8083/exams
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (System.Net.HttpWebRequest:HttpWebRequest) [Invoke-WebRequest], WebException
    + FullyQualifiedErrorId : WebCmdletWebResponseException,Microsoft.PowerShell.Commands.InvokeWebRequestCommand                                                                                                                                                                                                                                                                                                                     PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8080/analytics/lectures/1/dashboard                                                                                                                                                                                                                                                                                                                   
StatusCode        : 200
StatusDescription : OK
Content           : {"lectureId":1,"totalEvents":0,"slideChanges":0,"studentsJoined":0,"eventsByType":{},"slideActivity":[],"studentIds":[]}
RawContent        : HTTP/1.1 200 OK
                    transfer-encoding: chunked
                    Vary: Origin,Access-Control-Request-Method,Access-Control-Request-Headers
                    Content-Type: application/json
                    Date: Wed, 22 Apr 2026 06:08:05 GMT

                    {"lecture...
Forms             : {}
Headers           : {[transfer-encoding, chunked], [Vary, Origin,Access-Control-Request-Method,Access-Control-Request-Headers], [Content-Type, application/json], [Date, Wed, 22 Apr 2026 06:08:05 GMT]}
Images            : {}
InputFields       : {}
Links             : {}
ParsedHtml        : mshtml.HTMLDocumentClass
RawContentLength  : 120

                                                                                                                                                                                                                                                                                                                                                                                                                                      PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8080/api/content/presentations                                                                                                     curl : Удаленный сервер возвратил ошибку: (404) Не найден.                                                                                                                                                         строка:1 знак:1
+ curl http://localhost:8080/api/content/presentations
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (System.Net.HttpWebRequest:HttpWebRequest) [Invoke-WebRequest], WebException
    + FullyQualifiedErrorId : WebCmdletWebResponseException,Microsoft.PowerShell.Commands.InvokeWebRequestCommand

PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8080/quizzes/exams
curl : Удаленный сервер возвратил ошибку: (404) Не найден.
строка:1 знак:1
+ curl http://localhost:8080/quizzes/exams
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (System.Net.HttpWebRequest:HttpWebRequest) [Invoke-WebRequest], WebException
    + FullyQualifiedErrorId : WebCmdletWebResponseException,Microsoft.PowerShell.Commands.InvokeWebRequestCommand

PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8080/exams
curl : Удаленный сервер возвратил ошибку: (405) Недопустимый метод.
строка:1 знак:1
+ curl http://localhost:8080/exams
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (System.Net.HttpWebRequest:HttpWebRequest) [Invoke-WebRequest], WebException
    + FullyQualifiedErrorId : WebCmdletWebResponseException,Microsoft.PowerShell.Commands.InvokeWebRequestCommand

PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8080/lectures


StatusCode        : 200
StatusDescription : OK
Content           : []
RawContent        : HTTP/1.1 200 OK
                    transfer-encoding: chunked
                    Vary: Origin,Access-Control-Request-Method,Access-Control-Request-Headers
                    Content-Type: application/json
                    Date: Wed, 22 Apr 2026 06:10:41 GMT

                    []
Forms             : {}
Headers           : {[transfer-encoding, chunked], [Vary, Origin,Access-Control-Request-Method,Access-Control-Request-Headers], [Content-Type, application/json], [Date, Wed, 22 Apr 2026 06:10:41 GMT]}
Images            : {}
InputFields       : {}
Links             : {}
ParsedHtml        : mshtml.HTMLDocumentClass
RawContentLength  : 2



PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8080/analytics/lectures/1/dashboard


StatusCode        : 200
StatusDescription : OK
Content           : {"lectureId":1,"totalEvents":0,"slideChanges":0,"studentsJoined":0,"eventsByType":{},"slideActivity":[],"studentIds":[]}
RawContent        : HTTP/1.1 200 OK
                    transfer-encoding: chunked
                    Vary: Origin,Access-Control-Request-Method,Access-Control-Request-Headers
                    Content-Type: application/json
                    Date: Wed, 22 Apr 2026 06:10:46 GMT

                    {"lecture...
Forms             : {}
Headers           : {[transfer-encoding, chunked], [Vary, Origin,Access-Control-Request-Method,Access-Control-Request-Headers], [Content-Type, application/json], [Date, Wed, 22 Apr 2026 06:10:46 GMT]}
Images            : {}
InputFields       : {}
Links             : {}
ParsedHtml        : mshtml.HTMLDocumentClass
RawContentLength  : 120



PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8080/api/content/presentations
curl : Удаленный сервер возвратил ошибку: (404) Не найден.
строка:1 знак:1
+ curl http://localhost:8080/api/content/presentations
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (System.Net.HttpWebRequest:HttpWebRequest) [Invoke-WebRequest], WebException
    + FullyQualifiedErrorId : WebCmdletWebResponseException,Microsoft.PowerShell.Commands.InvokeWebRequestCommand

PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8080/quizzes/exams
curl : Удаленный сервер возвратил ошибку: (404) Не найден.
строка:1 знак:1
+ curl http://localhost:8080/quizzes/exams
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (System.Net.HttpWebRequest:HttpWebRequest) [Invoke-WebRequest], WebException
    + FullyQualifiedErrorId : WebCmdletWebResponseException,Microsoft.PowerShell.Commands.InvokeWebRequestCommand

PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8080/lectures/1
curl : Удаленный сервер возвратил ошибку: (500) Внутренняя ошибка сервера.
строка:1 знак:1
+ curl http://localhost:8080/lectures/1
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (System.Net.HttpWebRequest:HttpWebRequest) [Invoke-WebRequest], WebException
    + FullyQualifiedErrorId : WebCmdletWebResponseException,Microsoft.PowerShell.Commands.InvokeWebRequestCommand

PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8080/actuator/health
curl : {"timestamp":"2026-04-22T06:11:02.654+00:00","path":"/actuator/health","status":404,"error":"Not Found","requestId":"c9a268e3-11"}
строка:1 знак:1
+ curl http://localhost:8080/actuator/health
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (System.Net.HttpWebRequest:HttpWebRequest) [Invoke-WebRequest], WebException
    + FullyQualifiedErrorId : WebCmdletWebResponseException,Microsoft.PowerShell.Commands.InvokeWebRequestCommand
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8081/presentations
curl : Удаленный сервер возвратил ошибку: (404) Не найден.                                                                                                                                                         строка:1 знак:1                                                                                                                                                                                                    + curl http://localhost:8081/presentations                                                                                                                                                                         + ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~                                                                                                                                                                             + CategoryInfo          : InvalidOperation: (System.Net.HttpWebRequest:HttpWebRequest) [Invoke-WebRequest], WebException
    + FullyQualifiedErrorId : WebCmdletWebResponseException,Microsoft.PowerShell.Commands.InvokeWebRequestCommand

PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8083/exams
curl : Удаленный сервер возвратил ошибку: (405) Недопустимый метод.
строка:1 знак:1
+ curl http://localhost:8083/exams
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (System.Net.HttpWebRequest:HttpWebRequest) [Invoke-WebRequest], WebException
    + FullyQualifiedErrorId : WebCmdletWebResponseException,Microsoft.PowerShell.Commands.InvokeWebRequestCommand

PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8082/lectures


StatusCode        : 200
StatusDescription :
Content           : []
RawContent        : HTTP/1.1 200
                    Transfer-Encoding: chunked
                    Keep-Alive: timeout=60
                    Connection: keep-alive
                    Content-Type: application/json
                    Date: Wed, 22 Apr 2026 06:12:57 GMT

                    []
Forms             : {}
Headers           : {[Transfer-Encoding, chunked], [Keep-Alive, timeout=60], [Connection, keep-alive], [Content-Type, application/json]...}
Images            : {}
InputFields       : {}
Links             : {}
ParsedHtml        : mshtml.HTMLDocumentClass
RawContentLength  : 2



PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl http://localhost:8084/analytics/lectures/1/dashboard


StatusCode        : 200
StatusDescription :
Content           : {"lectureId":1,"totalEvents":0,"slideChanges":0,"studentsJoined":0,"eventsByType":{},"slideActivity":[],"studentIds":[]}
RawContent        : HTTP/1.1 200
                    Transfer-Encoding: chunked
                    Keep-Alive: timeout=60
                    Connection: keep-alive
                    Content-Type: application/json
                    Date: Wed, 22 Apr 2026 06:13:01 GMT

                    {"lectureId":1,"totalEvents":0,"slideC...
Forms             : {}
Headers           : {[Transfer-Encoding, chunked], [Keep-Alive, timeout=60], [Connection, keep-alive], [Content-Type, application/json]...}
Images            : {}
InputFields       : {}
Links             : {}
ParsedHtml        : mshtml.HTMLDocumentClass
RawContentLength  : 120
