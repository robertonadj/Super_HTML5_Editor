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

        window.requestFileSystem = window.requestFileSystem || 
        window.webkitRequestFileSystem
        || window.mozRequestFileSystem || window.msRequestFileSystem  || false;
        window.storageInfo = navigator.persistentStorage ||
        navigator.webkitPersistentStorage || navigator.mozPersistentStorage ||
        // por conveniência, indique possíveis prefixos de fornecedor dos objetos de sistema de arquivos.
        navigator.msPersistentStorage || false;
        
        // define as variáveis básicas a serem usadas no aplicativo.
        var stType = window.PERSISTENT || 1,
        stSize = (5*1024*1024),
        fileSystem,
        fileListEl = document.getElementById('files'),
        currentFile;

        // função de erro padrão para todas as chamadas de método da API File System.
        var fsError = function(e) {
            if(e.code === 9) {
                alert('File name already exists.', 'File System Error');
            } else {
                alert('An unexpected error ocurred. Error code: '+e.code);
            }
        };

        // função de erro padrão para todas as chamadas de método da API Quota Management.
        var qmError = function(e) {
            if(e.code === 22) {
                alert('Quota exceeded.', 'Quota Management Error');
            } else {
                alert('An unexpected error ocurred. Error code: '+e.code);
            }
        };

        // verifica se o navegador dá suporte a API File System e a API Quota Management.
        if(requestFileSystem && storageInfo) {
            var checkQuota = function(currentUsage, quota) {
                if(quota === 0) {
                    // já que esse aplicativo tem um sistema de arquivos persistente, a solicitação de cota acionará
                    // uma mensagem pedindo permissão do usuário para acessar o sistema de arquivos do navegador.
                    storageInfo.requestQuota(stType, stSize, getFS, qmError);
                } else {
                    getFS(quota);
                }
            };

            // se queryUsageAndQuota for executado com sucesso, ele passará informações de uso e de cota para a função de callback.
            storageInfo.queryUsageAndQuota(stType, checkQuota, qmError);

            var getFS = function(quota) {
                // o método requestFileSystem é usado na obtenção do objeto de sistema de arquivos.
                requestFileSystem(stType, quota, displayFileSystem, fsError);
            }

            var displayFileSystem = function(fs) {
                fileSystem = fs;
                // estas funções recuperarão e exibirão arquivos do sistema de arquivos do aplicativo.
                updateBrowserFilesList();
                if(view === 'editor') {
                    // se o modo de exibição de editor for o modo atual, carregue o arquivo no editor.
                    loadFile(fileName);
                }
            }
        } else {
            alert('File System API not supported', 'Unsupported');
        }

        var displayBrowserFileList = function(files) {
            fileListEl.innerHTML = '';
            // atualiza o contador com o número de arquivos do sistema de arquivos.
            document.getElementById('file_count').innerHTML = files.length;
            if(files.length > 0) {
                // itera por cada arquivo do sistema usando a função de array forEach.
                files.forEach(function(file, i) {
                    // draggable é sobre a interatividade de arrastar e soltar.
                    var li = '<li id="li_'+i+'" draggable="true">'+file.name
                    + '<div><button id="view_'+i+'">View</button>'
                    + '<button class="green" id="edit_'+i+'">Edit</button>'
                    + '<button class="red" id="del_'+i+'">Delete</button>'
                    + '</div></li>';
                    fileListEl.insertAdjacentHTML('beforeend', li);

                    var listItem = document.getElementById('li_'+i),
                    viewBtn = document.getElementById('view_'+i),
                    editBtn = document.getElementById('edit_'+i),
                    deleteBtn = document.getElementById('del_'+i);

                    var doDrag = function(e) { dragFile(file, e); }
                    var doView = function() { viewFile(file); }
                    var doEdit = function() { editFile(file); }
                    var doDelete = function() { deleteFile(file); }

                    // anexa manipuladores de eventos aos botões view, edit e delete e ao próprio item da lista.
                    viewBtn.addEventListener('click', doView, false);
                    editBtn.addEventListener('click', doEdit, false);
                    deleteBtn.addEventListener('click', doDelete, false);
                    // implementação do doDrag para dar suporte às funções de arrastar e soltar.
                    listItem.addEventListener('dragstart', doDrag, false);
                });
            } else { // se não houver arquivos, exiba uma mensagem de lista vazia.
                fileListEl.innerHTML = '<li class="empty">No files to display</li>'
            }
        };

        var updateBrowserFilesList = function() {
            // cria um leitor de diretório
            var dirReader = fileSystem.root.createReader(),
            files = [];
            // estamos lendo um conjunto de arquivos de cada vez na listagem do diretório, logo, usaremos uma função recursiva 
            // para se manter lendo até todos os arquivos serem recuperados.
            var readFileList = function() {
                dirReader.readEntries(function(fileSet) {
                    if(!fileSet.length) {
                        // quando o fim do diretório for alcançado, chama a função displayBrowserFileList, passando como argumento o array 
                        // de arquivos classificado alfabeticamente.
                        displayBrowserFileList(files.sort());
                    } else {
                        for(var i=0,len=fileSet.length; i<len; i++) {
                            // se não tiver chegado ao fim do diretório, insere os arquivos que acabaram de ser lidos no array
                            // e chama recursivamente a função readFileList novamente.
                            files.push(fileSet[i]);
                        }

                        readFileList();
                    }
                }, fsError);
            }

            readFileList();
        }; 

    };

    var init = function() {
        new SuperEditor();
    }

    window.addEventListener('load', init, false);
})();