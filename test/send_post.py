import requests

try:
	requests.post('http://localhost:27015/cgi/digits.cgi', data = b'1234567890')
except Exception as e:
	print(str(e))
