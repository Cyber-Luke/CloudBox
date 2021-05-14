<?php

/**
Spec:


/login ... => login user
/logout .. => logout user

/... => URL to files and folders:

GET /<DIR>
= return file/folders in this dir

POST /<DIR>
= create the directory and send message back

DELETE <DIR>
= delete the directory

GET /<file>
= return binary data of file

POST /<file>
= create the file with corresponding content

DELETE /<file>
= delete the file and send message


Authentication workflow:

POST /login with username password => return token

All other requests:
authorization: Basic base64(username.token)

*/

require "lib/Folder.php";
require "lib/File.php";
require "lib/Authenticator.php";

$authorized = false;

// Function to validate and sanitize paths to prevent path traversal
function sanitizePath($path) {
    // Remove any ../ or ..\ sequences
    $path = str_replace(['../', '..\\'], '', $path);
    // Normalize path separators
    $path = str_replace('\\', '/', $path);
    // Remove double slashes
    $path = preg_replace('#/+#', '/', $path);
    return $path;
}

//first check if user is valid
$headers = getallheaders();
$auth = array();
if(isset($headers["Authorization"])){
	$temp = explode(" ",$headers["Authorization"]);
	if(count($temp) >= 2 && $temp[0] === "Basic"){
		$raw_auth = base64_decode($temp[1]);
		$auth = explode(":",$raw_auth);
		if(count($auth) >= 2){
			$authenticator = new Authenticator();
			$authorized = $authenticator->verifyToken($auth[0],$auth[1]);
		}
	}
}

$url = filter_input(INPUT_SERVER,"REQUEST_URI",FILTER_SANITIZE_URL);

$paramPos = strpos($url,"?");
if($paramPos === false){
	$path = $url;
} else {
	$path = substr($url,0,$paramPos);
}

// Sanitize the path to prevent path traversal attacks
$path = sanitizePath($path);



$method = filter_input(INPUT_SERVER,"REQUEST_METHOD",FILTER_SANITIZE_FULL_SPECIAL_CHARS);
if($path != "/login" && !$authorized){
	http_response_code(401);
	echo '{"error": "authorization failed"}';
} else if($path == "/login"){
	$username = filter_input(INPUT_POST,"username",FILTER_SANITIZE_FULL_SPECIAL_CHARS);
	$password = $_POST["password"] ?? ''; // Don't sanitize password, keep it raw for verification
	
	if(empty($username) || empty($password)){
		http_response_code(400);
		echo '{"error": "username and password required"}';
	} else {
		$authenticator = new Authenticator();
		$result = $authenticator->authUser($username, $password);
		if(!$result){
			http_response_code(401);
			echo '{"error": "authentication failed"}';
		} else {
			http_response_code(200);
			echo '{"token": "'.$result.'"}';
		}
	}
} else if($path == "/logout"){
	if(count($auth) > 0){
		$authenticator = new Authenticator();
		if(!$authenticator->logoutToken($auth[0], $auth[1])){
			http_response_code(500);
			echo '{"error": "logout failed"}';
		} else {
			http_response_code(200);
			echo '{"message": "logout successful"}';
		}
	}
} else if($authorized){
	// Sanitize path and ensure it's within the data directory
	$sanitizedPath = sanitizePath(urldecode($path));
	$fullPath = realpath(__DIR__."/data") . $sanitizedPath;
	
	// Additional security check: ensure the resolved path is within data directory
	$dataDir = realpath(__DIR__."/data");
	if ($dataDir === false || strpos(realpath(dirname($fullPath)), $dataDir) !== 0) {
		http_response_code(403);
		echo '{"error": "Access denied"}';
		exit;
	}

	if($method == "GET"){
		$isDir = Folder::isDirectory($fullPath);
		if($isDir){
			$dir = new Folder($fullPath);
			$entries = $dir->getEntries();
			if($entries === false){
				http_response_code(500);
				echo '{"error": "failed to load directory entries"}';
			} else {
				http_response_code(200);
				echo json_encode($entries);
			}
		} else {
			$file = new File($fullPath);
			if($file->doExists()){
 				if(isset($_GET["format"]) && filter_input(INPUT_GET,"format",FILTER_SANITIZE_FULL_SPECIAL_CHARS) == "base64"){
					echo base64_encode($file->getContent());
				} else {
					header('Content-Type: '.$file->getMimeType());
					header('Content-Disposition: attachment; filename="'.$file->getFilename().'"');
					echo $file->getContent();
				}
			} else {
				http_response_code(500);
				echo '{"error": "file does not exist"}';
			}
		}
	}

	if($method == "POST"){
		if(isset($_POST["type"]) && filter_input(INPUT_POST,"type",FILTER_SANITIZE_FULL_SPECIAL_CHARS) == "dir"){
			$isDir = true;
		} else {
			$isDir = false;
		}
		if($isDir){
			$dir = new Folder($fullPath);
			if($dir->create() === false){
				http_response_code(500);
				echo '{"error": "failed to create directory"}';
			} else {
				http_response_code(200);
				echo '{"message": "directory created successfully"}';
			}
		} else {
			if(count($_FILES) == 0){ //no upload
				$file = new File($fullPath);
				//no filter, since we need to write the file as is
				$result = $file->writeContent(base64_decode($_POST["content"]));
			} else {
				$file = new File($fullPath);
				$result = $file->createFromUpload($_FILES["newFile"]);
			}

			if($result === false){
	                        http_response_code(500);
                                echo '{"error": "failed to write file"}';
                        } else {
                                http_response_code(200);
        	                echo '{"message": "file written successfully"}';
                        }
		}
	}

	if($method == "DELETE"){
		$isDir = Folder::isDirectory($fullPath);
                if($isDir){
                        $dir = new Folder($fullPath);
                        if(!$dir->delete()){
                                http_response_code(500);
                                echo '{"error": "failed to delete directory"}';
                        } else {
                                http_response_code(200);
                                echo '{"message": "directory deleted successfully"}';
                        }
                } else {
			$file = new File($fullPath);
			if(!$file->delete()){
				http_response_code(500);
				echo '{"error": "failed to delete file"}';
			} else {
				http_response_code(200);
				echo '{"message": "file deleted successfully"}';
			}
                }

	}

}
