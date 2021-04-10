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

        visualEditorDoc.designMode = 'on';

        visualEditorDoc.addEventListener('keyup', markDirty, false);
        htmlEditor.addEventListener('keyup', markDirty, false);

        var updateVisualEditor = function(content) {
            visualEditorDoc.open();
            visualEditorDoc.write(content);
        }
    };

    var init = function() {
        new SuperEditor();
    }

    window.addEventListener('load', init, false);
})();