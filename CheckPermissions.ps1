# CheckPermissions by Jean-Francois Desrochers
# Recursively dumps folders (or files, with switch -IncludeFiles) ACLs in a CSV file.

# Usage: CheckPermissions [RootPath] [OutFile] -ExcludeInherited -IncludeFiles
# RootPath: Path to check for ACLs, OutFile: CSV file to write, 
# ExcludeInherited: Exclude inherited ACLs, IncludeFiles: also scan for files

[CmdletBinding()]
Param(
    [Parameter(Mandatory=$True)]
    [string]$RootPath,

    [Parameter(Mandatory=$True)]
    [string]$OutFile,

    [switch]$ExcludeInherited,

    [switch]$IncludeFiles
)

$Header = '"Folder Path","IdentityReference","AccessControlType","IsInherited","InheritanceFlags","PropagationFlags"'
if ((Test-Path $OutFile) -eq $true) {
    Remove-Item $OutFile -Confirm
}
Add-Content -Value $Header -Path $OutFile

if ($IncludeFiles -eq $true) {
    $Folders = Get-ChildItem $RootPath -recurse -ErrorAction SilentlyContinue
} else {
    $Folders = Get-ChildItem $RootPath -recurse -Directory -ErrorAction SilentlyContinue
}

$Total = ($Folders | Measure-Object).count
$Current = 0

foreach ($Folder in $Folders) {
    $Current++
    Write-Progress -Activity "Getting Access Control List" -Status "Working on $Current / $Total" -PercentComplete (($Current / $Total) *100)
    if ($ExcludeInherited -eq $true) {
        $ACLs = get-acl $Folder.fullname -ErrorAction SilentlyContinue -ErrorVariable AccessDenied | ForEach-Object { $_.Access  } | Where-Object {$_.IsInherited -eq $false}
    } else {
        $ACLs = get-acl $Folder.fullname -ErrorAction SilentlyContinue -ErrorVariable AccessDenied | ForEach-Object { $_.Access  }
    }
	Foreach ($ACL in $ACLs) {
	    $OutInfo = '"' + $Folder.Fullname + '","' + $ACL.IdentityReference  + '","' + $ACL.AccessControlType + '","' + $ACL.IsInherited + '","' + $ACL.InheritanceFlags + '","' + $ACL.PropagationFlags + '"'
        Add-Content -Value $OutInfo -Path $OutFile
	}
}