import datetime
import os

from google.appengine.ext import db
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

class HighScore(db.Model):
	highscore = db.IntegerProperty(required = True)
	user = db.UserProperty()
	date = db.DateProperty(auto_now = True)

class App(webapp.RequestHandler):
	def get(self):
		highscores = db.GqlQuery("SELECT * FROM HighScore ORDER BY highscore DESC LIMIT 5")
		user = users.get_current_user()
		if user:
			highscore_notify = """Your current highscore is <span id='highscore'> 0</span> <a href='#' onclick="window.location='addhs?score='+document.querySelector('#highscore').innerHTML;">Submit </a>"""
		else:
			highscore_notify = "You need to be logged in to submit highscore <a href='%s'> Login </a> <span id='highscore' style='display:none'> 0</span>" % users.create_login_url(self.request.uri)
		template_values = {
			'highscores':highscores,
			'highscore_notify':highscore_notify
		}
		#print highscores
		path=os.path.join(os.path.dirname(__file__),'template/index.html')
		self.response.out.write(template.render(path,template_values))

class AddHighScore(webapp.RequestHandler):
	def get(self):
		try:
			referer = self.request.environ['HTTP_REFERER'] if 'HTTP_REFERER' in self.request.environ else  None
			if 'chrome-copter.appspot.com' in referer:
				highscore = HighScore(highscore = int(self.request.get('score')))
				highscore.user = users.get_current_user()
				highscore.put()
		except:
			pass
		self.redirect('/')

application = webapp.WSGIApplication([
  ('/', App),
  ('/addhs',AddHighScore) 
], debug=False)


def main():
  run_wsgi_app(application)

if __name__ == '__main__':
  main()
