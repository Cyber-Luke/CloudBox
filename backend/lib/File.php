<?php

class File {
	private $fullFilename = "";

	public function __construct($fullFilename){
		$this->fullFilename = $fullFilename;
	}

	public function doExists(){
		return file_exists($this->fullFilename);
	}

	public function getMimeType(){
		if(!$this->doExists()){
			return 'application/octet-stream';
		}
		$mimeType = mime_content_type($this->fullFilename);
		return $mimeType !== false ? $mimeType : 'application/octet-stream';
	}

	public function getContent(){
		return file_get_contents($this->fullFilename);
	}

	public function delete(){
		if(!$this->doExists()){
			return true; // File already deleted
		}
		return unlink($this->fullFilename);
	}

	public function getFilePath(){
		return dirname($this->fullFilename);
	}

	public function getFilename(){
		return basename($this->fullFilename);
	}

	protected function writeToFile($data,$flag){
		// Ensure the directory exists before writing
		$dir = dirname($this->fullFilename);
		if (!file_exists($dir)) {
			mkdir($dir, 0755, true);
		}
		return file_put_contents($this->fullFilename,$data,$flag);
	}

	public function addContent($data){
		return $this->writeToFile($data,FILE_APPEND);
	}

	public function writeContent($data){
		return $this->writeToFile($data,0);
	}

	public function createFromUpload($file){
		if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
			return false;
		}
		
		// Validate file upload
		if ($file['error'] !== UPLOAD_ERR_OK) {
			return false;
		}
		
		return move_uploaded_file($file['tmp_name'], $this->fullFilename);
	}
}
