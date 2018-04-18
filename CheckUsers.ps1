# CheckUsers by Jean-Francois Desrochers
# Dumps all the users and their respective groups from AD in a CSV file.

# Requirements: "Active Directory Module for Windows PowerShell": this feature must be installed on the server or the
#               workstation on which this script is to be run. It is a member of the RSAT (Remote Server Administration Tools)
#               package. A domain controller usually has this feature enabled by default.

# Usage: CheckUsers [OutFile] -OnlyActive
# OutFile: CSV file to write, 
# OnlyActive: Exclude users that are disabled.

[CmdletBinding()]
Param(

    [Parameter(Mandatory=$True)]
    [string]$OutFile,

    [switch]$OnlyActive
)

$Header = '"UserName","FullName","AccountActive","GroupName"'
if ((Test-Path $OutFile) -eq $true) {
    Remove-Item $OutFile -Confirm
}
Add-Content -Value $Header -Path $OutFile

if ($OnlyActive -eq $true) {
    Get-ADUser -Filter * | Where-Object {$_.Enabled -eq $true} | ForEach-Object {
        $User = $_
        $Groups = $User | Get-ADPrincipalGroupMembership
	    Foreach ($Group in $Groups) {
	        $OutInfo = '"' + $User.SamAccountName + '","' + $User.Name  + '","' + $User.Enabled + '","' + $Group.Name + '"'
            Add-Content -Value $OutInfo -Path $OutFile
	    }
    }
} else {
    Get-ADUser -Filter * | ForEach-Object {
        $User = $_
        $Groups = $User | Get-ADPrincipalGroupMembership
	    Foreach ($Group in $Groups) {
	        $OutInfo = '"' + $User.SamAccountName + '","' + $User.Name  + '","' + $User.Enabled + '","' + $Group.Name + '"'
            Add-Content -Value $OutInfo -Path $OutFile
	    }
    }
}