(function() {
    var SuperEditor = function() {
        // essas variaveis armazenarão o modo de exibição e o nome de arquivo atuais.
        var view, fileName, isDirty = false,
        unsavedMsg = 'Unsaved changes will be lost. Are you sure?',
        unsavedTitle = 'Discard changes';

        var markDirty = function() {
            isDirty = true;
        };

        var markClean = function() {
            isDirty = false;
        };

        var checkDirty = function() {
            if(isDirty) { return unsavedMsg; }
        };

        // se o usuário tentar fechar ou ir pra outra página, verifica se ele fez alterações e o avisa para salvar.
        window.addEventListener('beforeunload', checkDirty, false);

        // o manipulador de eventos jump usa hashes no url para se alternar entre os dois modos de exibição.
        var jump = function(e) {
            var hash = location.hash;

            // se o hash do url tiver uma barra, ele deve exibir o modo file editor do arquivo que vem após a barra.
            if(hash.indexOf('/') > -1) {
                var parts = hash.split('/'),
                fileNameEl = document.getElementById('file_name');

                view = parts[0].substring(1) + '-view';
                fileName = parts[1];
                fileNameEl.innerHTML = fileName;
            } else {
                if(!isDirty || confirm(unsavedMsg, unsavedTitle)) {
                    markClean();
                    view = 'browser-view';
                    if(hash != '#list') {
                        location.hash = '#list';
                    }
                } else {
                    location.href = e.oldURL;
                }
            }

            // usa o atributo de classe no elemento body para indicar qual é o modo de exibição atual.
            document.body.className = view;
        };

        jump();

        // a função jump é chamada no carregamento da página e sempre que o hash do url muda.
        window.addEventListener('hashchange', jump, false);

        var editVisualButton = document.getElementById('edit_visual'),
        visualView = document.getElementById('file_contents_visual'),
        visualEditor = document.getElementById('file_contents_visual_editor'),
        visualEditorDoc = visualEditor, contentDocument,
        editHtmlButton = document.getElementById('edit_html'),
        htmlView = document.getElementById('file_contents_html'),
        htmlEditor = document.getElementById('file_contents_html_editor');

        // permite a edição do iframe do editor visual ativando sua propriedade design mode.
        visualEditorDoc.designMode = 'on';

        // marca o arquivo como alterado sempre que o usuário fizer alterações em um dos editores.
        visualEditorDoc.addEventListener('keyup', markDirty, false);
        htmlEditor.addEventListener('keyup', markDirty, false);

        // esta função atualiza o conteúdo do editor visual.
        var updateVisualEditor = function(content) {
            visualEditorDoc.open();
            visualEditorDoc.write(content);
            visualEditorDoc.close();
            visualEditorDoc.addEventListener('keyup', markDirty, false);
        };

        // esta função atualiza o conteúdo do editor de html.
        var updateHtmlEditor = function(content) {
            htmlEditor.value = content;
        };

        // este manipulador de eventos se alterna entre os editores visual e de html.
        var toggleActiveView = function() {
            if(htmlView.style.display == 'block') {
                editVisualButton.className = 'split_left active';
                visualView.style.display = 'block';
                editHtmlButton.className = 'split_right';
                htmlView.style.display = 'none';
                updateVisualEditor(htmlEditor.value);
            } else {
                editHtmlButton.className = 'split_right active';
                htmlView.style.display = 'block';
                editVisualButton.className = 'split_left';
                visualView.style.display = 'none';

                var x = new XMLSerializer();
                var content = x.serializeToString(visualEditorDoc);
                updateHtmlEditor(content);
            }
        }

        editVisualButton.addEventListener('click', toggleActiveView, false);
        editHtmlButton.addEventListener('click', toggleActiveView, false);

        var visualEditorToolbar = document.getElementById('file_contents_visual_toolbar');

        // richtextaction é o manipulador de eventos de todos os botões da barra de ferramentas do editor visual.
        var richTextAction = function(e) {
            var command,
            node = (e.target.nodeName  === "BUTTON") ? e.target :
            e.target.parentNode;

            // o objeto dataset oferece acesso conveniente aos atributos data do html5.
            if(node.dataset) {
                command = node.dataset.command;
            } else {
                command = node.getAttribute('data-command');
            }

            var doPopupCommand = function(command, promptText, promptDefault) {
                // já que esse aplicativo requer uma ui personalizada, showui será configurado como false.
                visualEditorDoc.execCommand(command, false, prompt(promptText, promptDefault));
            }

            if(command === 'createLink') {
                doPopupCommand(command, 'Enter link URL:', 'http://www.example.com');
            } else if(command === 'insertImage') {
                doPopupCommand(command, 'Enter image URL:', 'http://www.example.com/image.png');
            } else if (command === 'insertMap') {
                // verifica se o navegador do usuário dá suporte à geolocalização.
                if(navigator.geolocation) {
                    node.innerHTML = 'Loading';
                    // o método getCurrentPosition fará o navegador solicitar ao usuário acesso à sua localização.
                    navigator.geolocation.getCurrentPosition(function(pos) {
                        var coords = pos.coords.latitude+','+pos.coords.longitude;
                        var img = 'http://maps.googleapis.com/maps/api/staticmap?markers='+coords+'&zoom=11&size=200x200&sensor=false';
                        // usa execCommand para gerar uma imagem estática do Google Maps com a localização do usuário.
                        visualEditorDoc.execCommand('insertImage', false, img);
                        node.innerHTML = 'Location Map';
                    });
                } else {
                    alert('Geolocation not available', 'No geolocation data');
                }
            } else {
                visualEditorDoc.execCommand(command);
            }
        };

        visualEditorToolbar.addEventListener('click', richTextAction, false);
    };

    var init = function() {
        new SuperEditor();
    }

    window.addEventListener('load', init, false);
})();