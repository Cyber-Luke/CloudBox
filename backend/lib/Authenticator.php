<?php

class Authenticator{

	private $dbDN = "sqlite:auth.db";
	private $tokenValidity = 600;

	private function createInitalDB(){
		try {
			$db = new PDO($this->dbDN);
			$db->exec("CREATE TABLE users (user TEXT, pass TEXT)");
			// Use password_hash instead of MD5 for security
			$db->exec("INSERT INTO users VALUES('admin','".password_hash("admin", PASSWORD_DEFAULT)."')");
			$db->exec("CREATE TABLE tokens (username TEXT, token TEXT, validTo INT)");
			unset($db);
		} catch (PDOException $e) {
			error_log("Database error: " . $e->getMessage());
			return false;
		}
	}

	private function createToken($username){
		// Use random_bytes for cryptographically secure token generation
		$token = bin2hex(random_bytes(32));
		$validTo = time()+$this->tokenValidity;

		try {
			$db = new PDO($this->dbDN);
			$stmt = $db->prepare("INSERT INTO tokens VALUES (:USER, :TOKEN, :VALIDTO)");
			$result = $stmt->execute(array(
				":USER" => $username,
				":TOKEN" => $token,
				":VALIDTO" => $validTo
				));
			unset($db);
			if($result){
				return $token;
			} else {
				return false;
			}
		} catch (PDOException $e) {
			error_log("Database error: " . $e->getMessage());
			return false;
		}
	}

	public function createUser($username,$password){
		try {
			$db = new PDO($this->dbDN);
			$stmt = $db->prepare("INSERT INTO users VALUES(:USER,:PASS)");
			$result = $stmt->execute(array(
				":USER" => $username,
				":PASS" => password_hash($password, PASSWORD_DEFAULT)
				));
			unset($db);
			return $result;
		} catch (PDOException $e) {
			error_log("Database error: " . $e->getMessage());
			return false;
		}
	}

	public function deleteUser($username){
		try {
			$db = new PDO($this->dbDN);
			$stmt = $db->prepare("DELETE FROM users WHERE user = :USER");
			$result = $stmt->execute(array(
				":USER" => $username
				));
			unset($db);
			return $result;
		} catch (PDOException $e) {
			error_log("Database error: " . $e->getMessage());
			return false;
		}
	}

	public function authUser($username,$password){
	        if(!file_exists("auth.db")){
                        $this->createInitalDB();
                }
		try {
			$db = new PDO($this->dbDN);
			$stmt = $db->prepare("SELECT pass FROM users WHERE user = :USER");
			$result = $stmt->execute(array(
				":USER" => $username
				));
			if($result){
				$temp = $stmt->fetchAll();
				if(count($temp) == 1 && password_verify($password, $temp[0]["pass"])){
					return $this->createToken($username);
				} else {
					return false;
				}
			} else {
				return false;
			}
		} catch (PDOException $e) {
			error_log("Database error: " . $e->getMessage());
			return false;
		}
	}

	public function verifyToken($username,$token){
		try {
			$db = new PDO($this->dbDN);
			$stmt = $db->prepare("SELECT COUNT(*) AS NUMTOK FROM tokens WHERE username = :USER and token = :TOKEN and validTo >= :VALIDTO");
			$result = $stmt->execute(array(
				":USER" => $username,
				":TOKEN" => $token,
				":VALIDTO" => time()
				));
			if($result){
				$temp = $stmt->fetchAll();
				if(intval($temp[0]["NUMTOK"]) == 1){
					$stmt2 = $db->prepare("UPDATE tokens SET validTo = :VALIDTO WHERE token = :TOKEN");
					$result = $stmt2->execute(array(
						":VALIDTO" => time()+$this->tokenValidity,
						":TOKEN" => $token
						));
					unset($db);
					return $result;
				} else {
					unset($db);
					return false;
				}
			} else {
				unset($db);
				return false;
			}
		} catch (PDOException $e) {
			error_log("Database error: " . $e->getMessage());
			unset($db);
			return false;
		}
	}

	public function logoutToken($username, $token){
		try {
			$db = new PDO($this->dbDN);
			$stmt = $db->prepare("DELETE FROM tokens WHERE username = :USER AND token = :TOKEN");
			$result = $stmt->execute(array(
				":USER" => $username,
				":TOKEN" => $token
				));
			return $result;
		} catch (PDOException $e) {
			error_log("Database error: " . $e->getMessage());
			return false;
		}
	}
}
