@echo off
set LOGFILE="E:\DestDir\op.log"
del %LOGFILE%
del "E:\DestDir\Permissions.csv" >> %LOGFILE%
del "E:\DestDir\Users.csv" >> %LOGFILE%
powershell -File .\CheckPermissions.ps1 E:\SourceDir\ "E:\DestDir\Permissions.csv" -ExcludeInherited -IncludeFiles >> %LOGFILE%
powershell -File .\CheckUsers.ps1 "E:\DestDir\Users.csv" -OnlyActive >> %LOGFILE%