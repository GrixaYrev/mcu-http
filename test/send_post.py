import requests

try:
	with open('bigfile.pdf', 'rb') as f:
		ret = requests.post('http://localhost:27015/post/bigfile.pdf', data = f)
		print(ret)
except Exception as e:
	print(str(e))
