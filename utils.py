import string

__check_email_format = lambda email: re.match(".+@.+\..{2,}", email) is not None
__check_ascii = lambda s: all(c in string.printable for c in s)

def flat_multi(multidict):
	flat = {}
	for key, values in multidict.items():
		value = values[0] if type(values) == list and len(values) == 1 else values
		flat[key] = value.encode("utf-8")
	return flat