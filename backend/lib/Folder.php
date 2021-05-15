<?php

class Folder{
	private $fullDirname = "";

	public static function isDirectory($fullPath){
		return is_dir($fullPath);
	}

	public function __construct($fullDirname){
		if(substr($fullDirname,-1,1)=="/" && $fullDirname != "/"){
			$fullDirname=substr($fullDirname,0,-1);
		}
		$this->fullDirname = $fullDirname;
	}

	public function create(){
		if (!file_exists($this->fullDirname)) {
			return mkdir($this->fullDirname, 0755, true);
		}
		return true; // Directory already exists
	}

	public function isEmpty(){
		if(!file_exists($this->fullDirname) || !is_dir($this->fullDirname)){
			return true;
		}
		return (count(scandir($this->fullDirname)) <= 2);
	}

	public function delete(){
		if(!file_exists($this->fullDirname)){
			return true; // Already deleted
		}
		if($this->isEmpty()){
			return rmdir($this->fullDirname);
		}else{
			return false;
		}
	}

	public function getFoldername(){
		return basename($this->fullDirname);
	}

	public function getFolderpath(){
		return dirname($this->fullDirname);
	}

	public function getEntries(){
		$entries = array();
		if($dir = opendir($this->fullDirname)){

			while (false !== ($entry = readdir($dir))) {
				if($entry != "." && $entry != ".."){
					if(is_dir($this->fullDirname."/".$entry)){
						$temp = array("Name" => $entry, "Type" => "dir");
					}else{
						$temp = array("Name" => $entry, "Type" => mime_content_type($this->fullDirname."/".$entry));
					}
					array_push($entries,$temp);
				}
			}

			closedir($dir);
			return $entries;

		}else{
			return false;
		}
	}
}
