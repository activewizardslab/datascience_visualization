from fabric.api import cd, sudo, env, run, prefix
from fabric.contrib.console import confirm
import os

def dev():
    env.hosts = ['146.185.157.143']
    env.user = 'root'
    env.key_filename = os.path.join('ssh', 'aw-do-app5')
    env.project_root = '/var/www/html/awo208'
    env.activate = 'source .env/bin/activate'

def deploy():
    answer = confirm("This command will update application on the server. Continue?" , False)

    if not answer:
        return

    with cd(env.project_root), prefix(env.activate):
        # update code from git repo
        run('git pull origin master')
        # update project requirements
        run('pip install -r requirements.txt')
        # restart web-server
        sudo('service apache2 restart')

    print 'http://awo208.app5.activewizards.com/ updated'
