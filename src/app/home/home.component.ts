import { Component, OnInit, Inject } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '@auth0/auth0-angular';
import { DOCUMENT } from '@angular/common';
import {MatSidenavModule} from '@angular/material/sidenav';
import { ViewChild, ElementRef, AfterViewChecked, AfterViewInit } from '@angular/core';
import { Subject } from 'rxjs/internal/Subject';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})

export class HomeComponent implements AfterViewInit {
  @ViewChild('chatContainer') chatContainer: ElementRef | null = null;
  private unsubscribe$ = new Subject<void>();
  
  constructor(
    private apiServe: ApiService,
    public authServe: AuthService,
    private router: Router,
    private httpClient: HttpClient,
    @Inject(DOCUMENT) public document: Document
  ) {
    // Check if the user is authenticated when the component is constructed
    this.authServe.isAuthenticated$.subscribe((isAuthenticated) => {
      this.loggedIn = isAuthenticated; // Update loggedIn flag based on authentication state
      if (isAuthenticated) {
        // If authenticated, also fetch user data and save it in local storage
        this.authServe.user$.subscribe((data: any) => {
          this.googleId = data?.sub?.split("|")[1];
          this.name = data?.name;
          this.email = data?.email;
          this.picture = data?.picture;
          const userData = {
            googleId: this.googleId,
            name: this.name,
            email: this.email,
            picture: this.picture,
          };
          localStorage.setItem('userData', JSON.stringify(userData));
          this.placeH = "Please enter your prompt here...";
          this.getChats();
        });

      } else {
        // If the user is not authenticated, check local storage for user data
        const userData = localStorage.getItem('userData');
        if (userData) {
          this.loggedIn = true;
          const parsedUserData = JSON.parse(userData);
          this.googleId = parsedUserData.googleId;
          this.name = parsedUserData.name;
          this.email = parsedUserData.email;
          this.picture = parsedUserData.picture;
          this.placeH = "Please enter your prompt here...";
          this.getChats();
        }
      }
    });
  }

  customApi: string = "";
  customApiFlag: boolean = false;
  upload: boolean = false;
  showFormResponse: boolean = false;
  sideNav: boolean = true;
  signatureText: string = "";

  spellIsTyping: boolean = false;
  riskIsTyping: boolean = false;
  risktext!: string;
  spelltext!: string;
  spellflag: boolean = false;
  riskflag: boolean = false;
  internetMode: boolean = false;

  editMode: boolean = false;
  loggedIn: boolean = false;
  showLogoutBtn: boolean = false;
  opened: boolean = false;
  isClicked: boolean = false;
  wholeChat: any[] = [{
    googleId: "",
    id: "",
    response: ""
  }];
  currentChat: any = {
    googleId: "",
    id: "",
    response: ""
  };

  botIsTyping: boolean = false;

  googleId: string = "";
  email!: string;
  picture!: string;
  name!: string;

  value: string = "";
  temp!: string;
  aiRes!: string;
  newc!: boolean;

  dataReq: any = {
    prompt: this.value,
    conversationId: "",
    googleId: this.googleId
  };

  placeH: string = "You need to login first to be able to prompt...";

  // Signing Form Dialog
  formDialog: boolean = false;
  signer1!: string;
  signer2!: string;
  title!: string;
  subject!: string;
  message!: string;
  cc: string[] = ["", ""];

  toggleSetting() {
    this.customApiFlag = !this.customApiFlag;
  }

  autoScrollToBottom() {
    // Scroll to the bottom of the chat container
    if (this.chatContainer)
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
  }

  set promptVal(value: string) {
    this.temp = value;
  }

  deleteBtn(chat: any) {
    this.deleteConv(chat);
    this.delete(chat);
    this.getChats();
  }

  formatResponse(response: string): string {
    // Use a regular expression to find text between ** **
    return response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  internetToggle() {
    this.internetMode = !this.internetMode;
  }

  generateUniqueId() {
    const timestamp = Date.now();
    return `chat_${timestamp}`;
  }

  takeUsHome(data: any) {
    this.wholeChat = [];
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const array = data[key];
        const lastElement = array[array.length - 1];
        this.wholeChat.push({
          googleId: this.googleId,
          id: key,
          response: lastElement
        });
      }
    }
  }

  newChat() {
    if (this.loggedIn) {
      this.riskflag = false;
      this.spellflag = false;
      this.newc = true;
      this.aiRes = "";
      this.value = "";
      this.temp = "";
      this.currentChat = {
        googleId: this.googleId,
        id: "",
        response: ""
      };
    }
  }

  getChats() {
    this.apiServe.get_conversations(this.googleId)
      .subscribe((response: any) => {
        this.riskflag = false;
        this.spellflag = false;
        
        this.takeUsHome(response);
        this.newChat();
      });
  }

  changeConv(chat: any) {
    this.riskflag = false;
    this.spellflag = false;
    this.aiRes = chat.response;
    this.currentChat = chat;
    this.newc = false;
    

    // Make a new class to make the current chat looks like the chat we clicked on
  }

  updateChat(word: string) {
    if (!this.upload) {
      this.currentChat.response = word;
      this.aiRes = word;

      var indexToUpdate = this.wholeChat.findIndex(obj => obj.id === this.currentChat.id);

      if (indexToUpdate !== -1) {
        // Replace the object at the specific index with the updated object
        this.wholeChat[indexToUpdate].response = this.currentChat.response;
      }
      
      this.apiServe.update({
        google_id: this.googleId,
        conv_id: this.currentChat.id,
        response: word,
      })
        .subscribe((response: any) => {
          if (this.editMode) {
            this.toggleEdit();
          }
        });
    }
    else {
      this.upload = false; 

      this.currentChat.response = this.aiRes;

      var indexToUpdate = this.wholeChat.findIndex(obj => obj.id === this.currentChat.id);

      if (indexToUpdate !== -1) {
        // Replace the object at the specific index with the updated object
        this.wholeChat[indexToUpdate].response = this.currentChat.response;
      }
      
      this.apiServe.update({
        google_id: this.googleId,
        conv_id: this.currentChat.id,
        response: this.currentChat.response,
      })
        .subscribe((response: any) => {
          if (this.editMode) {
            this.toggleEdit();
          }
        });
    }
  }

  sendprompt() {
    this.riskflag = false;
    this.spellflag = false;
    this.botIsTyping = !this.upload;
    var idd = "";

    if (this.currentChat.id == "") {
      idd = this.generateUniqueId();
    }
    else {
      idd = this.currentChat.id;
      this.newc = false;
    }

    this.value = (!this.upload)? this.temp: this.aiRes;
    this.temp = "";

    this.dataReq.prompt = this.value;
    this.dataReq.conversationId = idd;
    this.dataReq.googleId = this.googleId;

    
    if (this.value != "\n") {
      if (this.value != "") {

        if (!this.internetMode) {
          this.apiServe.send(this.dataReq).subscribe((response: any) => {
            this.currentChat.id = idd;
  
            this.updateChat(response.response);
            this.botIsTyping = false;
            this.autoScrollToBottom();
            
            if(this.newc) {
              this.wholeChat.push(this.currentChat);
              // Make a new class to make the current chat looks like the chat we clicked on
  
            }
          });
        }
        else {
          this.apiServe.internet(this.dataReq).subscribe((response: any) => {
            this.currentChat.id = idd;
  
            this.updateChat(response.response);
            this.botIsTyping = false;
            this.autoScrollToBottom();
            
            if(this.newc) {
              this.wholeChat.push(this.currentChat);
              // Make a new class to make the current chat looks like the chat we clicked on
  
            }
          });
        }

      }
    }
  }

  risk() {
    this.riskflag = true;
    this.riskIsTyping = true;
    this.apiServe.risk({
      conversationId: this.currentChat.id,
      prompt: this.currentChat.response,
    })
      .subscribe((response: any) => {
        this.riskIsTyping = false;
        this.risktext = response.response;
      });
  }

  spell() {
    this.spellflag = true;
    this.spellIsTyping = true;
    this.apiServe.spell({
      conversationId: this.currentChat.id,
      prompt: this.currentChat.response,
    })
      .subscribe((response: any) => {
        this.spellIsTyping = false;
        this.spelltext = response.response;
      });
  }

  deleteConv(chat: any) {
    this.apiServe.deleteConv({conversationId: chat.id}).subscribe((response: any) => {
      console.log(response);
      this.wholeChat = this.wholeChat;
    });
  }

  delete(chat: any) {
    this.apiServe.delete({conversationId: chat.id}).subscribe((response: any) => {
      console.log(response);
      this.wholeChat = this.wholeChat;
    });
  }

  uploadText(event: Event): void {
    this.upload = true
    const target = event.target as HTMLInputElement;
    if (target && target.files) {
      const files = target.files;
      if (files.length > 0) {
        const formData = new FormData();
  
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          console.log(`Uploading text from file: ${file.name}`);
          // Append the file to the form data
          formData.append('file', file, file.name);
        }
  
        // Send the form data to the backend
        this.httpClient.post('https://contractgptbackend-production.up.railway.app/convert', formData).subscribe(
          (response: any) => {
            console.log('File uploaded successfully:', response);
            // Handle the response from the backend here
            if (response && response.text) {
              // Assuming that the response is in JSON format and has a "text" property
              this.aiRes = response.text; // Update aiRes with the response text

              this.sendprompt();
            } else {
              this.aiRes = "Invalid response format"; // Handle the case where the response is not as expected
            }
            this.autoScrollToBottom(); // Scroll to the bottom of the chat container
          },
          (error) => {
            console.error('Error uploading file:', error);
            // Handle the error here
            this.upload = false;
          }
        );
      }
    }
  }
  
  deleteVal() {
    this.temp = "";
  }

  toggleEdit() {
    this.editMode = !this.editMode;
  }

  ngAfterViewInit() {
    if (this.chatContainer) {
      this.autoScrollToBottom();
    }
  }
  
  log(state: any) {
    if(state == "opened") {
      this.hideIcon();
      this.sideNav = true;
    }
    else {
      this.showIcon();
      this.sideNav = false;
    }
  }

  hideIcon() {
    let myDiv = document.getElementById('toggle1');
    if(myDiv)
      myDiv.style.display = 'none';
  }

  showIcon() {
    let myDiv = document.getElementById('toggle1');
    if(myDiv)
      myDiv.style.display = 'block';
  }
  
  showLogout() {
    this.showLogoutBtn = !this.showLogoutBtn;
  }

  logout() {
    this.riskflag = false;
    this.spellflag = false;
    // Perform the logout action, such as calling your authentication service's logout method
    this.authServe.logout();
  
    // Remove user data from local storage
    localStorage.removeItem('userData');
  
    // Update the loggedIn flag to reflect the user's logout state
    this.loggedIn = false;
  }

  sendSign() {
    const btn = document.getElementsByClassName('bttn')[0];
    btn.innerHTML = "Sending...";
    this.apiServe.sign({
      signer_1_email: this.signer1,
      signer_2_email: this.signer2,
      title: this.title,
      subject: this.subject,
      message: this.message,
      cc_email_addresses: this.cc,
      chat: this.currentChat.response,
      api: this.customApi
    })
      .subscribe((response: any) => {
        console.log(response);
        console.log(response.status);
        this.showFormResponse = true;
        if(response.status == 200) {
          this.signatureText = "Check your email to sign the document!"
        }
        else {
          this.signatureText = "Something went wrong, please try again!"
        }
      });
  }

  toggleForm() {
    this.formDialog = !this.formDialog;
    this.riskflag = false;
    this.spellflag = false;
    this.showFormResponse = false;
  }


}
