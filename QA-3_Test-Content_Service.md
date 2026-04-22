1. Content Service — работа с презентациями и слайдами
# Загрузить презентацию (POST с файлом)
curl.exe -X POST http://localhost:8080/presentations/upload -F "file=@C:\Users\Seren\Documents\Temp\этика.pdf"
получен следующий ответ: 
{
"sequenceId":"caa5e244-3446-47d4-ab29-5bd1e4211023",
"slideCount":28
}
# Получить информацию о слайдах
curl.exe http://localhost:8080/slide-sequences/caa5e244-3446-47d4-ab29-5bd1e4211023
{"id":"caa5e244-3446-47d4-ab29-5bd1e4211023",
"name":"этика.pdf",
"slides":[
"c709d25d-d659-4946-bee1-6bacd4b24bea",
"99d71c68-d26c-4bcf-b334-82caaeb0bad3",
"758f08dd-cedd-450a-90e4-461b1c52a133",
"0ae6348c-ca75-4ea5-9fce-bd51d54e194d",
"0ae6bb3d-1e81-4052-9aa3-7ba66b9a6c8d",
"da9ff348-4e98-4ef4-9347-347725440de2",
"f5e428d8-f669-4b57-86af-3b18e557f477",
"5e2487c7-828b-4bc6-a385-c8bed3e0b658",
"9ed44ec6-c507-4103-985a-4bf937f43d24",
"151b8cd2-3ae7-49ca-8e50-c06a348f8080",
"36087622-080c-442a-833b-d6d4f9861229",
"ca17b4c9-1bfd-4f55-b009-9799c5724967",
"208e29b4-ec39-4b70-8f4f-6ac0bf79339e",
"98368215-4942-4966-829d-e0dcee73ccb0",
"d9109431-055c-45b3-b60e-166c536fe0c5",
"5ed86b35-b134-4153-8b11-69494bed4007",
"ccd4515e-57ae-4066-959d-c934c1d9e5b8",
"f1b51360-f92e-4df7-a878-62e2c2469be5",
"93908fe5-f0aa-4693-9b46-55f89101d83d",
"49a5da11-2b2b-4f75-a0fe-a334db9672b4",
"6262a1d6-42ce-4015-8be6-63a995f9996b",
"05d6a65e-f489-4c0b-8637-cce9b4efdcd3",
"76d47c9f-cc19-47b6-947d-0ff0dc7efdee",
"6ab3627f-4da9-4241-bbcf-857a5f41d7fa",
"26695160-f284-4f4e-bbe5-c477d89bde9d",
"e1351990-0364-4547-8e0f-1e4c4ede6826",
"f318415e-c465-47f8-b389-58188b156e63",
"e12efcf4-6f6b-4926-b4f3-65c1f54156ea"],
"createdAt":"2026-04-22T09:13:27.245129",
"updatedAt":"2026-04-22T09:13:27.245147"
}
# Получить слайд по ID 
curl.exe http://localhost:8080/slides/c709d25d-d659-4946-bee1-6bacd4b24bea
Так как используется терминал windows 10 powerShell он выдает «Warning: Binary output can mess up your terminal. Use "--output -" to tell curl to output it to your terminal anyway, or consider "--output <FILE>" to save to a file.», переводится, как:
Внимание: двоичный вывод может испортить работу терминала. Используйте «--output -», чтобы указать curl выводить данные в терминал в любом случае, или рассмотрите вариант «--output <FILE>», чтобы сохранить данные в файл.
Поэтому был выбран вариант сохранения файла слайда в корень проекта, из которого собирался докер образ с которым я и работаю, вывод:
PS C:\Users\Seren\Documents\StudentPJ\lecturer-assistant> curl.exe http://localhost:8080/slides/c709d25d-d659-4946-bee1-6bacd4b24bea --output slide0.png
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                		   Dload    Upload   Total   Spent    Left  Speed
100 1617k  100 1617k    0     0  29.9M      0 --:--:-- --:--:-- --:--:-- 30.3M
Файл соответствует 1 слайду/странице прикрепленного файла
Но к нему не применено не какое сжатие из-за чего получается, что изначальный файл, состоящий из 4 страниц, весит исходя из его размера 5,52 МБ (5 798 295 байт) а полученный файл весит 1,57 МБ (1 656 737 байт), всего в презентации 28 слайдов, а это был только один.
# Обновить порядок слайдов
curl.exe -X PUT http://localhost:8080/slide-sequences/caa5e244-3446-47d4-ab29-5bd1e4211023 -H "Content-Type: application/json" -d '["c709d25d-d659-4946-bee1-6bacd4b24bea", "e12efcf4-6f6b-4926-b4f3-65c1f54156ea"]'
{"timestamp":"2026-04-22T09:44:01.863+00:00","status":400,"error":"Bad Request","path":"/slide-sequences/caa5e244-3446-47d4-ab29-5bd1e4211023"}
При попытке обносить порядок слайдов происходит ошибка: в файле QA3-errlog_1.txt; передаю id слайдов 1 и 28.
